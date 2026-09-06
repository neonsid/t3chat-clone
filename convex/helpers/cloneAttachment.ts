import { ConvexError } from "convex/values"

import {
  ATTACHMENT_UNBOUND_TTL_MS,
  MAX_ATTACHMENT_ID_LENGTH,
} from "../attachmentConstants"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

type ViewerMutationCtx = MutationCtx & { viewerId: string }

export async function cloneReadyAttachment(
  ctx: ViewerMutationCtx,
  source: Doc<"attachments">,
  bind:
    | {
        threadId: Id<"threads">
        messageId: string
      }
    | null
): Promise<string> {
  if (source.ownerId !== ctx.viewerId) {
    throw new ConvexError("Attachment not found")
  }
  if (source.status !== "ready") {
    throw new ConvexError("Attachment is not ready")
  }

  const attachmentId = crypto.randomUUID()
  const now = Date.now()
  await ctx.db.insert("attachments", {
    ownerId: ctx.viewerId,
    attachmentId,
    objectKey: source.objectKey,
    filename: source.filename,
    mimeType: source.mimeType,
    sizeBytes: source.sizeBytes,
    kind: source.kind,
    extractedText: source.extractedText,
    extractedTokenEstimate: source.extractedTokenEstimate,
    status: "ready",
    bindingStatus: bind ? "bound" : "unbound",
    threadId: bind?.threadId,
    messageId: bind?.messageId,
    createdAt: now,
    expiresAt: bind ? undefined : now + ATTACHMENT_UNBOUND_TTL_MS,
  })
  return attachmentId
}

export async function cloneReadyAttachmentForFork(
  ctx: ViewerMutationCtx,
  source: Doc<"attachments">,
  bind: {
    threadId: Id<"threads">
    messageId: string
  }
): Promise<string> {
  if (source.status !== "ready") {
    throw new ConvexError("Attachment is not ready")
  }

  const attachmentId = crypto.randomUUID()
  await ctx.db.insert("attachments", {
    ownerId: ctx.viewerId,
    attachmentId,
    objectKey: source.objectKey,
    filename: source.filename,
    mimeType: source.mimeType,
    sizeBytes: source.sizeBytes,
    kind: source.kind,
    extractedText: source.extractedText,
    extractedTokenEstimate: source.extractedTokenEstimate,
    status: "ready",
    bindingStatus: "bound",
    threadId: bind.threadId,
    messageId: bind.messageId,
    createdAt: Date.now(),
  })
  return attachmentId
}

export async function getOwnedAttachmentById(
  ctx: ViewerMutationCtx,
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

export async function cloneReadyAttachmentsByIds(
  ctx: ViewerMutationCtx,
  attachmentIds: string[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  const seen = new Set<string>()

  for (const attachmentId of attachmentIds) {
    if (seen.has(attachmentId)) continue
    seen.add(attachmentId)
    const source = await getOwnedAttachmentById(ctx, attachmentId)
    if (source.status !== "ready") continue
    map[attachmentId] = await cloneReadyAttachment(ctx, source, null)
  }

  return map
}
