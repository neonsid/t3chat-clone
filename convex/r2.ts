"use node"

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { R2 } from "@convex-dev/r2"
import { ConvexError, v } from "convex/values"

import { components, internal } from "./_generated/api"
import { action, internalAction } from "./_generated/server"
import {
  ATTACHMENT_DELETE_BATCH_SIZE,
  ATTACHMENT_GET_URL_MODEL_TTL_SECONDS,
  ATTACHMENT_GET_URL_UI_TTL_SECONDS,
  ATTACHMENT_PUT_URL_TTL_SECONDS,
} from "./attachmentConstants"

function r2Options() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET
  const endpoint =
    process.env.R2_ENDPOINT ??
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined)

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new ConvexError("R2 is not configured")
  }

  return { accessKeyId, secretAccessKey, bucket, endpoint }
}

function getR2() {
  return new R2(components.r2, r2Options())
}

async function requireViewerId(ctx: {
  auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> }
}) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError("Not authenticated")
  return identity.tokenIdentifier
}

function matchesMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
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
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    )
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
  r2: R2,
  objectKey: string,
  byteCount: number
): Promise<Uint8Array> {
  const response = await r2.client.send(
    new GetObjectCommand({
      Bucket: r2.config.bucket,
      Key: objectKey,
      Range: `bytes=0-${byteCount - 1}`,
    })
  )
  const body = response.Body
  if (!body) throw new Error("Empty object body")
  return await body.transformToByteArray()
}

export const getUploadUrl = action({
  args: { attachmentId: v.string() },
  returns: v.object({
    putUrl: v.string(),
    attachmentId: v.string(),
    mimeType: v.string(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
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

    const r2 = getR2()
    // Sign Content-Type so the client cannot PUT a different MIME than declared.
    const putUrl: string = await getSignedUrl(
      r2.client,
      new PutObjectCommand({
        Bucket: r2.config.bucket,
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
  handler: async (
    ctx,
    args
  ): Promise<{
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

    const url: string = await getR2().getUrl(attachment.objectKey, {
      expiresIn,
    })

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
  handler: async (
    ctx,
    args
  ): Promise<
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

    const r2 = getR2()
    const results: Array<{
      attachmentId: string
      url: string
      mimeType: string
      kind: "image" | "pdf"
      filename: string
    }> = []
    for (const attachment of rows) {
      if (attachment.status !== "ready") continue
      const url: string = await r2.getUrl(attachment.objectKey, {
        expiresIn: ATTACHMENT_GET_URL_MODEL_TTL_SECONDS,
      })
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

export const mintOwnedModelDownloadUrls = action({
  args: {
    attachmentIds: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      attachmentId: v.string(),
      url: v.string(),
      mimeType: v.string(),
      kind: v.union(v.literal("image"), v.literal("pdf")),
      filename: v.string(),
      sizeBytes: v.number(),
    })
  ),
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{
      attachmentId: string
      url: string
      mimeType: string
      kind: "image" | "pdf"
      filename: string
      sizeBytes: number
    }>
  > => {
    const ownerId = await requireViewerId(ctx)
    if (args.attachmentIds.length === 0) return []

    const uniqueIds = [...new Set(args.attachmentIds)]
    const r2 = getR2()
    const results: Array<{
      attachmentId: string
      url: string
      mimeType: string
      kind: "image" | "pdf"
      filename: string
      sizeBytes: number
    }> = []

    for (const attachmentId of uniqueIds) {
      const attachment: {
        objectKey: string
        mimeType: string
        filename: string
        kind: "image" | "pdf"
        status: string
        sizeBytes: number
        attachmentId: string
      } | null = await ctx.runQuery(internal.attachments.authorizeForOwner, {
        ownerId,
        attachmentId,
      })
      if (!attachment || attachment.status !== "ready") continue
      const url: string = await r2.getUrl(attachment.objectKey, {
        expiresIn: ATTACHMENT_GET_URL_MODEL_TTL_SECONDS,
      })
      results.push({
        attachmentId: attachment.attachmentId,
        url,
        mimeType: attachment.mimeType,
        kind: attachment.kind,
        filename: attachment.filename,
        sizeBytes: attachment.sizeBytes,
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
      const r2 = getR2()
      const head = await r2.client.send(
        new HeadObjectCommand({
          Bucket: r2.config.bucket,
          Key: attachment.objectKey,
        })
      )

      const contentLength = head.ContentLength
      if (
        contentLength === undefined ||
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

      const prefix = await readObjectPrefix(r2, attachment.objectKey, 16)
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
    } catch {
      await ctx.runMutation(internal.attachments.markFailed, {
        ownerId: args.ownerId,
        attachmentId: args.attachmentId,
        errorMessage: "Unable to verify uploaded file",
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

    const r2 = getR2()
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
        const result = await r2.client.send(
          new DeleteObjectsCommand({
            Bucket: r2.config.bucket,
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
