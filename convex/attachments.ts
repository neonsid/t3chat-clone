import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import { internalMutation, internalQuery } from "./_generated/server"
import {
  ATTACHMENT_GC_BATCH_SIZE,
  ATTACHMENT_UNBOUND_TTL_MS,
  ATTACHMENT_UNSUPPORTED_ERROR,
  LEGACY_DOC_ERROR,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_ATTACHMENT_FILENAME_LENGTH,
  MAX_ATTACHMENT_ID_LENGTH,
  MIME_TO_KIND,
  isAllowedAttachmentMimeType,
  isLegacyWordFilename,
  maxBytesForAttachmentKind,
} from "./attachmentConstants"
import { MAX_THREAD_MESSAGES } from "./constants"
import { cloneReadyAttachmentsByIds } from "./helpers/cloneAttachment"
import { authedMutation, authedQuery } from "./helpers/functions"
import { attachmentKindValidator } from "./schema"
import { shouldDeleteSharedObject } from "../src/lib/attachment-object-refs"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

const ATTACHMENT_OBJECT_KEY_SIBLING_LIMIT = 32

const attachmentPublicValidator = v.object({
  attachmentId: v.string(),
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  kind: attachmentKindValidator,
  extractedTokenEstimate: v.optional(v.number()),
  status: v.union(
    v.literal("pending_upload"),
    v.literal("uploaded"),
    v.literal("processing"),
    v.literal("ready"),
    v.literal("failed"),
    v.literal("deleting")
  ),
  bindingStatus: v.union(v.literal("unbound"), v.literal("bound")),
  threadId: v.optional(v.id("threads")),
  messageId: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),
})

type DbCtx = Pick<QueryCtx | MutationCtx, "db">

async function hashOwnerId(ownerId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ownerId)
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32)
}

function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim().slice(0, MAX_ATTACHMENT_FILENAME_LENGTH)
  let cleaned = ""
  for (const char of trimmed) {
    const code = char.charCodeAt(0)
    if (code >= 32 && code !== 127) cleaned += char
  }
  cleaned = cleaned.trim()
  return cleaned || "attachment"
}

function toPublicAttachment(doc: Doc<"attachments">) {
  return {
    attachmentId: doc.attachmentId,
    filename: doc.filename,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    kind: doc.kind,
    extractedTokenEstimate: doc.extractedTokenEstimate,
    status: doc.status,
    bindingStatus: doc.bindingStatus,
    threadId: doc.threadId,
    messageId: doc.messageId,
    errorMessage: doc.errorMessage,
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt,
  }
}

async function getOwnedAttachment(
  ctx: DbCtx & { viewerId: string },
  attachmentId: string
): Promise<Doc<"attachments">> {
  if (!attachmentId.trim() || attachmentId.length > MAX_ATTACHMENT_ID_LENGTH) {
    throw new ConvexError("Invalid attachment id")
  }

  const attachment = await ctx.db
    .query("attachments")
    .withIndex("by_ownerId_and_attachmentId", (query) =>
      query.eq("ownerId", ctx.viewerId).eq("attachmentId", attachmentId)
    )
    .unique()

  if (!attachment) throw new ConvexError("Attachment not found")
  return attachment
}

async function scheduleDurableDelete(
  ctx: MutationCtx,
  docs: Array<Doc<"attachments">>
) {
  if (docs.length === 0) return

  const batchDocIds = new Set(docs.map((doc) => doc._id as string))
  const deleteKeyByObject = new Map<string, boolean>()
  const r2ObjectKeys: Array<string> = []
  const r2DocIds: Array<Id<"attachments">> = []
  const localDocIds: Array<Id<"attachments">> = []

  for (const doc of docs) {
    await ctx.db.patch("attachments", doc._id, {
      status: "deleting",
      bindingStatus: "unbound",
      threadId: undefined,
      messageId: undefined,
      expiresAt: undefined,
    })
  }

  for (const doc of docs) {
    let deleteObject = deleteKeyByObject.get(doc.objectKey)
    if (deleteObject === undefined) {
      const siblings = await ctx.db
        .query("attachments")
        .withIndex("by_objectKey", (query) =>
          query.eq("objectKey", doc.objectKey)
        )
        .take(ATTACHMENT_OBJECT_KEY_SIBLING_LIMIT)
      deleteObject =
        siblings.length < ATTACHMENT_OBJECT_KEY_SIBLING_LIMIT &&
        shouldDeleteSharedObject({
          batchDocIds,
          siblings,
        })
      deleteKeyByObject.set(doc.objectKey, deleteObject)
    }

    if (deleteObject) {
      r2ObjectKeys.push(doc.objectKey)
      r2DocIds.push(doc._id)
    } else {
      localDocIds.push(doc._id)
    }
  }

  for (const attachmentDocId of localDocIds) {
    const doc = await ctx.db.get("attachments", attachmentDocId)
    if (!doc || doc.status !== "deleting") continue
    await ctx.db.delete("attachments", attachmentDocId)
  }

  if (r2ObjectKeys.length === 0) return

  await ctx.scheduler.runAfter(0, internal.r2.deleteObjects, {
    objectKeys: r2ObjectKeys,
    attachmentDocIds: r2DocIds,
  })
}

export const authorizeForOwner = internalQuery({
  args: {
    ownerId: v.string(),
    attachmentId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("attachments"),
      ownerId: v.string(),
      attachmentId: v.string(),
      objectKey: v.string(),
      filename: v.string(),
      mimeType: v.string(),
      sizeBytes: v.number(),
      kind: attachmentKindValidator,
      status: v.union(
        v.literal("pending_upload"),
        v.literal("uploaded"),
        v.literal("processing"),
        v.literal("ready"),
        v.literal("failed"),
        v.literal("deleting")
      ),
      bindingStatus: v.union(v.literal("unbound"), v.literal("bound")),
      threadId: v.optional(v.id("threads")),
      messageId: v.optional(v.string()),
      modelDownloadUrl: v.optional(v.string()),
      modelDownloadUrlExpiresAt: v.optional(v.number()),
      extractedText: v.optional(v.string()),
      extractedTokenEstimate: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const attachment = await ctx.db
      .query("attachments")
      .withIndex("by_ownerId_and_attachmentId", (query) =>
        query.eq("ownerId", args.ownerId).eq("attachmentId", args.attachmentId)
      )
      .unique()
    if (!attachment) return null
    return {
      _id: attachment._id,
      ownerId: attachment.ownerId,
      attachmentId: attachment.attachmentId,
      objectKey: attachment.objectKey,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      kind: attachment.kind,
      status: attachment.status,
      bindingStatus: attachment.bindingStatus,
      threadId: attachment.threadId,
      messageId: attachment.messageId,
      modelDownloadUrl: attachment.modelDownloadUrl,
      modelDownloadUrlExpiresAt: attachment.modelDownloadUrlExpiresAt,
      extractedText: attachment.extractedText,
      extractedTokenEstimate: attachment.extractedTokenEstimate,
    }
  },
})

export const authorizeManyForOwner = internalQuery({
  args: {
    ownerId: v.string(),
    threadId: v.id("threads"),
    attachmentIds: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      attachmentId: v.string(),
      objectKey: v.string(),
      filename: v.string(),
      mimeType: v.string(),
      kind: attachmentKindValidator,
      extractedText: v.optional(v.string()),
      extractedTokenEstimate: v.optional(v.number()),
      status: v.union(
        v.literal("pending_upload"),
        v.literal("uploaded"),
        v.literal("processing"),
        v.literal("ready"),
        v.literal("failed"),
        v.literal("deleting")
      ),
      modelDownloadUrl: v.optional(v.string()),
      modelDownloadUrlExpiresAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const results = []
    for (const attachmentId of args.attachmentIds) {
      const attachment = await ctx.db
        .query("attachments")
        .withIndex("by_ownerId_and_attachmentId", (query) =>
          query.eq("ownerId", args.ownerId).eq("attachmentId", attachmentId)
        )
        .unique()
      if (
        !attachment ||
        attachment.threadId !== args.threadId ||
        attachment.bindingStatus !== "bound"
      ) {
        continue
      }
      results.push({
        attachmentId: attachment.attachmentId,
        objectKey: attachment.objectKey,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        kind: attachment.kind,
        extractedText: attachment.extractedText,
        extractedTokenEstimate: attachment.extractedTokenEstimate,
        status: attachment.status,
        modelDownloadUrl: attachment.modelDownloadUrl,
        modelDownloadUrlExpiresAt: attachment.modelDownloadUrlExpiresAt,
      })
    }
    return results
  },
})

export const createUploadIntent = authedMutation({
  args: {
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  returns: v.object({
    attachmentId: v.string(),
    mimeType: v.string(),
    kind: attachmentKindValidator,
  }),
  handler: async (ctx, args) => {
    if (
      isLegacyWordFilename(args.filename) ||
      args.mimeType === "application/msword"
    ) {
      throw new ConvexError(LEGACY_DOC_ERROR)
    }
    if (!isAllowedAttachmentMimeType(args.mimeType)) {
      throw new ConvexError(ATTACHMENT_UNSUPPORTED_ERROR)
    }
    const kind = MIME_TO_KIND[args.mimeType]
    const maxBytes = maxBytesForAttachmentKind(kind)
    if (
      !Number.isFinite(args.sizeBytes) ||
      args.sizeBytes <= 0 ||
      args.sizeBytes > maxBytes
    ) {
      throw new ConvexError("Invalid attachment size")
    }

    const filename = sanitizeFilename(args.filename)
    const attachmentId = crypto.randomUUID()
    const ownerHash = await hashOwnerId(ctx.viewerId)
    const objectKey = `attachments/${ownerHash}/${attachmentId}/object`
    const now = Date.now()

    await ctx.db.insert("attachments", {
      ownerId: ctx.viewerId,
      attachmentId,
      objectKey,
      filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      kind,
      status: "pending_upload",
      bindingStatus: "unbound",
      createdAt: now,
      expiresAt: now + ATTACHMENT_UNBOUND_TTL_MS,
    })

    return {
      attachmentId,
      mimeType: args.mimeType,
      kind,
    }
  },
})

export const confirmUpload = authedMutation({
  args: { attachmentId: v.string() },
  returns: attachmentPublicValidator,
  handler: async (ctx, args) => {
    const attachment = await getOwnedAttachment(ctx, args.attachmentId)
    if (attachment.bindingStatus !== "unbound") {
      throw new ConvexError("Attachment cannot be confirmed")
    }
    if (attachment.status !== "pending_upload") {
      return toPublicAttachment(attachment)
    }

    await ctx.db.patch("attachments", attachment._id, {
      status: "uploaded",
    })
    await ctx.scheduler.runAfter(0, internal.r2.verifyObject, {
      ownerId: ctx.viewerId,
      attachmentId: attachment.attachmentId,
    })

    return toPublicAttachment({
      ...attachment,
      status: "uploaded",
    })
  },
})

export const cloneForBranch = authedMutation({
  args: {
    attachmentIds: v.array(v.string()),
  },
  returns: v.record(v.string(), v.string()),
  handler: async (ctx, args) => {
    if (
      args.attachmentIds.length >
      MAX_ATTACHMENTS_PER_MESSAGE * MAX_THREAD_MESSAGES
    ) {
      throw new ConvexError("Too many attachments")
    }
    return await cloneReadyAttachmentsByIds(ctx, args.attachmentIds)
  },
})

export const get = authedQuery({
  args: { attachmentId: v.string() },
  returns: v.union(attachmentPublicValidator, v.null()),
  handler: async (ctx, args) => {
    try {
      const attachment = await getOwnedAttachment(ctx, args.attachmentId)
      return toPublicAttachment(attachment)
    } catch {
      return null
    }
  },
})

export const listByIds = authedQuery({
  args: { attachmentIds: v.array(v.string()) },
  returns: v.array(attachmentPublicValidator),
  handler: async (ctx, args) => {
    if (args.attachmentIds.length > MAX_ATTACHMENTS_PER_MESSAGE * 4) {
      throw new ConvexError("Too many attachment ids")
    }
    const results = []
    for (const attachmentId of args.attachmentIds) {
      const attachment = await ctx.db
        .query("attachments")
        .withIndex("by_ownerId_and_attachmentId", (query) =>
          query.eq("ownerId", ctx.viewerId).eq("attachmentId", attachmentId)
        )
        .unique()
      if (attachment) results.push(toPublicAttachment(attachment))
    }
    return results
  },
})

export const listForThreadMessages = authedQuery({
  args: { threadId: v.id("threads") },
  returns: v.array(attachmentPublicValidator),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get("threads", args.threadId)
    if (
      !thread ||
      thread.ownerId !== ctx.viewerId ||
      thread.state !== "active"
    ) {
      return []
    }

    // Bound attachments share threadId; collect a capped page via message index.
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_threadId_and_messageId", (query) =>
        query.eq("threadId", args.threadId)
      )
      .take(MAX_ATTACHMENTS_PER_MESSAGE * 80)

    return attachments
      .filter((attachment) => attachment.status === "ready")
      .map(toPublicAttachment)
  },
})

export const discard = authedMutation({
  args: { attachmentId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await getOwnedAttachment(ctx, args.attachmentId)
    if (attachment.bindingStatus === "bound") {
      throw new ConvexError("Bound attachments cannot be discarded")
    }
    if (attachment.status === "deleting") return null

    await scheduleDurableDelete(ctx, [attachment])
    return null
  },
})

export const storeModelDownloadUrl = internalMutation({
  args: {
    ownerId: v.string(),
    attachmentId: v.string(),
    url: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await ctx.db
      .query("attachments")
      .withIndex("by_ownerId_and_attachmentId", (query) =>
        query.eq("ownerId", args.ownerId).eq("attachmentId", args.attachmentId)
      )
      .unique()
    if (!attachment || attachment.status !== "ready") return null
    await ctx.db.patch("attachments", attachment._id, {
      modelDownloadUrl: args.url,
      modelDownloadUrlExpiresAt: args.expiresAt,
    })
    return null
  },
})

export const markProcessing = internalMutation({
  args: {
    ownerId: v.string(),
    attachmentId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await ctx.db
      .query("attachments")
      .withIndex("by_ownerId_and_attachmentId", (query) =>
        query.eq("ownerId", args.ownerId).eq("attachmentId", args.attachmentId)
      )
      .unique()
    if (!attachment) return null
    if (
      attachment.status !== "uploaded" &&
      attachment.status !== "processing"
    ) {
      return null
    }
    await ctx.db.patch("attachments", attachment._id, {
      status: "processing",
      errorMessage: undefined,
    })
    return null
  },
})

export const markReady = internalMutation({
  args: {
    ownerId: v.string(),
    attachmentId: v.string(),
    extractedText: v.optional(v.string()),
    extractedTokenEstimate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await ctx.db
      .query("attachments")
      .withIndex("by_ownerId_and_attachmentId", (query) =>
        query.eq("ownerId", args.ownerId).eq("attachmentId", args.attachmentId)
      )
      .unique()
    if (!attachment) return null
    if (
      attachment.status !== "uploaded" &&
      attachment.status !== "processing"
    ) {
      return null
    }
    await ctx.db.patch("attachments", attachment._id, {
      status: "ready",
      errorMessage: undefined,
      extractedText: args.extractedText,
      extractedTokenEstimate: args.extractedTokenEstimate,
    })
    return null
  },
})

export const markFailed = internalMutation({
  args: {
    ownerId: v.string(),
    attachmentId: v.string(),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await ctx.db
      .query("attachments")
      .withIndex("by_ownerId_and_attachmentId", (query) =>
        query.eq("ownerId", args.ownerId).eq("attachmentId", args.attachmentId)
      )
      .unique()
    if (!attachment) return null
    if (attachment.status === "ready" || attachment.status === "deleting") {
      return null
    }
    await ctx.db.patch("attachments", attachment._id, {
      status: "failed",
      errorMessage: args.errorMessage.slice(0, 300),
    })
    return null
  },
})

export const removeDeletedDocs = internalMutation({
  args: {
    attachmentDocIds: v.array(v.id("attachments")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const attachmentDocId of args.attachmentDocIds) {
      const doc = await ctx.db.get("attachments", attachmentDocId)
      if (!doc || doc.status !== "deleting") continue
      await ctx.db.delete("attachments", attachmentDocId)
    }
    return null
  },
})

export const gcOrphans = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now()
    const expired = await ctx.db
      .query("attachments")
      .withIndex("by_bindingStatus_and_expiresAt", (query) =>
        query.eq("bindingStatus", "unbound").lt("expiresAt", now)
      )
      .take(ATTACHMENT_GC_BATCH_SIZE)

    const toDelete = expired.filter(
      (attachment) => attachment.status !== "deleting"
    )
    await scheduleDurableDelete(ctx, toDelete)

    if (expired.length === ATTACHMENT_GC_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.attachments.gcOrphans, {})
    }
    return null
  },
})

export const beginThreadAttachmentDeletion = internalMutation({
  args: { threadId: v.id("threads") },
  returns: v.object({
    remaining: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_threadId_and_messageId", (query) =>
        query.eq("threadId", args.threadId)
      )
      .take(ATTACHMENT_GC_BATCH_SIZE)

    if (attachments.length === 0) {
      return { remaining: false }
    }

    // Clears threadId after capturing keys so the next batch advances.
    await scheduleDurableDelete(ctx, attachments)
    return { remaining: attachments.length === ATTACHMENT_GC_BATCH_SIZE }
  },
})

export const beginOwnerAttachmentDeletion = internalMutation({
  args: { ownerId: v.string() },
  returns: v.object({
    remaining: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_ownerId_and_attachmentId", (query) =>
        query.eq("ownerId", args.ownerId)
      )
      .take(ATTACHMENT_GC_BATCH_SIZE)

    if (attachments.length === 0) {
      return { remaining: false }
    }

    await scheduleDurableDelete(ctx, attachments)
    return { remaining: attachments.length === ATTACHMENT_GC_BATCH_SIZE }
  },
})
