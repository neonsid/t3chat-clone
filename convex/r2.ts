"use node"

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import { action, internalAction } from "./_generated/server"
import {
  ATTACHMENT_DELETE_BATCH_SIZE,
  ATTACHMENT_GET_URL_MODEL_TTL_SECONDS,
  ATTACHMENT_GET_URL_UI_TTL_SECONDS,
  ATTACHMENT_PUT_URL_TTL_SECONDS,
} from "./attachmentConstants"

function requireR2Env() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new ConvexError("R2 is not configured")
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
  }
}

function createR2Client() {
  const env = requireR2Env()
  return {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    }),
    bucket: env.bucket,
  }
}

async function requireViewerId(ctx: {
  auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> }
}) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError("Not authenticated")
  return identity.tokenIdentifier
}

function matchesMagicBytes(
  bytes: Uint8Array,
  mimeType: string
): boolean {
  if (mimeType === "application/pdf") {
    return (
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    )
  }
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    )
  }
  if (mimeType === "image/gif") {
    return (
      bytes.length >= 6 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61
    )
  }
  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    )
  }
  return false
}

async function readObjectPrefix(
  client: S3Client,
  bucket: string,
  objectKey: string,
  byteCount: number
): Promise<Uint8Array> {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Range: `bytes=0-${byteCount - 1}`,
    })
  )
  const body = response.Body
  if (!body) throw new Error("Empty object body")
  const bytes = await body.transformToByteArray()
  return bytes
}

export const getUploadUrl = action({
  args: { attachmentId: v.string() },
  returns: v.object({
    putUrl: v.string(),
    attachmentId: v.string(),
    mimeType: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    putUrl: string
    attachmentId: string
    mimeType: string
  }> => {
    const ownerId = await requireViewerId(ctx)
    const attachment: {
      objectKey: string
      mimeType: string
      attachmentId: string
      status: string
    } | null = await ctx.runQuery(internal.attachments.authorizeForOwner, {
      ownerId,
      attachmentId: args.attachmentId,
    })
    if (!attachment) throw new ConvexError("Attachment not found")
    if (attachment.status !== "pending_upload") {
      throw new ConvexError("Upload URL is no longer available")
    }

    const { client, bucket } = createR2Client()
    const putUrl: string = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: attachment.objectKey,
        ContentType: attachment.mimeType,
      }),
      { expiresIn: ATTACHMENT_PUT_URL_TTL_SECONDS }
    )

    return {
      putUrl,
      attachmentId: attachment.attachmentId,
      mimeType: attachment.mimeType,
    }
  },
})

export const getDownloadUrl = action({
  args: {
    attachmentId: v.string(),
    purpose: v.optional(v.union(v.literal("ui"), v.literal("model"))),
  },
  returns: v.object({
    url: v.string(),
    expiresInSeconds: v.number(),
    mimeType: v.string(),
    filename: v.string(),
    kind: v.union(v.literal("image"), v.literal("pdf")),
  }),
  handler: async (ctx, args): Promise<{
    url: string
    expiresInSeconds: number
    mimeType: string
    filename: string
    kind: "image" | "pdf"
  }> => {
    const ownerId = await requireViewerId(ctx)
    const attachment: {
      objectKey: string
      mimeType: string
      filename: string
      kind: "image" | "pdf"
      status: string
    } | null = await ctx.runQuery(internal.attachments.authorizeForOwner, {
      ownerId,
      attachmentId: args.attachmentId,
    })
    if (!attachment) throw new ConvexError("Attachment not found")
    if (attachment.status !== "ready") {
      throw new ConvexError("Attachment is not ready")
    }

    const purpose = args.purpose ?? "ui"
    const expiresIn =
      purpose === "model"
        ? ATTACHMENT_GET_URL_MODEL_TTL_SECONDS
        : ATTACHMENT_GET_URL_UI_TTL_SECONDS

    const { client, bucket } = createR2Client()
    const url: string = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: attachment.objectKey,
      }),
      { expiresIn }
    )

    return {
      url,
      expiresInSeconds: expiresIn,
      mimeType: attachment.mimeType,
      filename: attachment.filename,
      kind: attachment.kind,
    }
  },
})

export const mintModelDownloadUrls = action({
  args: {
    threadId: v.id("threads"),
    attachmentIds: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      attachmentId: v.string(),
      url: v.string(),
      mimeType: v.string(),
      kind: v.union(v.literal("image"), v.literal("pdf")),
      filename: v.string(),
    })
  ),
  handler: async (ctx, args): Promise<
    Array<{
      attachmentId: string
      url: string
      mimeType: string
      kind: "image" | "pdf"
      filename: string
    }>
  > => {
    const ownerId = await requireViewerId(ctx)
    if (args.attachmentIds.length === 0) return []

    const uniqueIds = [...new Set(args.attachmentIds)]
    const rows: Array<{
      attachmentId: string
      objectKey: string
      filename: string
      mimeType: string
      kind: "image" | "pdf"
      status: string
    }> = await ctx.runQuery(internal.attachments.authorizeManyForOwner, {
      ownerId,
      threadId: args.threadId,
      attachmentIds: uniqueIds,
    })

    const { client, bucket } = createR2Client()
    const results: Array<{
      attachmentId: string
      url: string
      mimeType: string
      kind: "image" | "pdf"
      filename: string
    }> = []
    for (const attachment of rows) {
      if (attachment.status !== "ready") continue
      const url: string = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: attachment.objectKey,
        }),
        { expiresIn: ATTACHMENT_GET_URL_MODEL_TTL_SECONDS }
      )
      results.push({
        attachmentId: attachment.attachmentId,
        url,
        mimeType: attachment.mimeType,
        kind: attachment.kind,
        filename: attachment.filename,
      })
    }
    return results
  },
})

export const verifyObject = internalAction({
  args: {
    ownerId: v.string(),
    attachmentId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await ctx.runQuery(
      internal.attachments.authorizeForOwner,
      {
        ownerId: args.ownerId,
        attachmentId: args.attachmentId,
      }
    )
    if (!attachment) return null
    if (
      attachment.status !== "uploaded" &&
      attachment.status !== "processing"
    ) {
      return null
    }

    await ctx.runMutation(internal.attachments.markProcessing, {
      ownerId: args.ownerId,
      attachmentId: args.attachmentId,
    })

    try {
      const { client, bucket } = createR2Client()
      const head = await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: attachment.objectKey,
        })
      )

      const contentLength = head.ContentLength
      if (
        typeof contentLength !== "number" ||
        contentLength !== attachment.sizeBytes
      ) {
        await ctx.runMutation(internal.attachments.markFailed, {
          ownerId: args.ownerId,
          attachmentId: args.attachmentId,
          errorMessage: "Uploaded file size does not match",
        })
        return null
      }

      // Content-Type from R2 is reliable when we signed PutObject with it.
      if (
        head.ContentType &&
        head.ContentType.split(";")[0]?.trim().toLowerCase() !==
          attachment.mimeType.toLowerCase()
      ) {
        await ctx.runMutation(internal.attachments.markFailed, {
          ownerId: args.ownerId,
          attachmentId: args.attachmentId,
          errorMessage: "Uploaded content type does not match",
        })
        return null
      }

      const prefix = await readObjectPrefix(
        client,
        bucket,
        attachment.objectKey,
        16
      )
      if (!matchesMagicBytes(prefix, attachment.mimeType)) {
        await ctx.runMutation(internal.attachments.markFailed, {
          ownerId: args.ownerId,
          attachmentId: args.attachmentId,
          errorMessage: "File contents do not match the declared type",
        })
        return null
      }

      await ctx.runMutation(internal.attachments.markReady, {
        ownerId: args.ownerId,
        attachmentId: args.attachmentId,
      })
    } catch (error) {
      await ctx.runMutation(internal.attachments.markFailed, {
        ownerId: args.ownerId,
        attachmentId: args.attachmentId,
        errorMessage:
          error instanceof Error
            ? "Unable to verify uploaded file"
            : "Unable to verify uploaded file",
      })
    }

    return null
  },
})

export const deleteObjects = internalAction({
  args: {
    objectKeys: v.array(v.string()),
    attachmentDocIds: v.array(v.id("attachments")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.objectKeys.length === 0) {
      await ctx.runMutation(internal.attachments.removeDeletedDocs, {
        attachmentDocIds: args.attachmentDocIds,
      })
      return null
    }

    const { client, bucket } = createR2Client()
    const failedKeys: Array<string> = []
    const failedDocIds: typeof args.attachmentDocIds = []
    const succeededDocIds: typeof args.attachmentDocIds = []

    for (
      let offset = 0;
      offset < args.objectKeys.length;
      offset += ATTACHMENT_DELETE_BATCH_SIZE
    ) {
      const keyChunk = args.objectKeys.slice(
        offset,
        offset + ATTACHMENT_DELETE_BATCH_SIZE
      )
      const docChunk = args.attachmentDocIds.slice(
        offset,
        offset + ATTACHMENT_DELETE_BATCH_SIZE
      )

      try {
        const result = await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: keyChunk.map((Key) => ({ Key })),
              Quiet: true,
            },
          })
        )
        const errored = new Set(
          (result.Errors ?? [])
            .map((entry) => entry.Key)
            .filter((key): key is string => Boolean(key))
        )
        for (let index = 0; index < keyChunk.length; index++) {
          const key = keyChunk[index]
          const docId = docChunk[index]
          if (errored.has(key)) {
            failedKeys.push(key)
            failedDocIds.push(docId)
          } else {
            succeededDocIds.push(docId)
          }
        }
      } catch {
        failedKeys.push(...keyChunk)
        failedDocIds.push(...docChunk)
      }
    }

    if (succeededDocIds.length > 0) {
      await ctx.runMutation(internal.attachments.removeDeletedDocs, {
        attachmentDocIds: succeededDocIds,
      })
    }

    if (failedKeys.length > 0) {
      await ctx.scheduler.runAfter(30_000, internal.r2.deleteObjects, {
        objectKeys: failedKeys,
        attachmentDocIds: failedDocIds,
      })
    }

    return null
  },
})
