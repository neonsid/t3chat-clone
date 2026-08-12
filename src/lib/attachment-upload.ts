import ky, { HTTPError } from "ky"

import { api } from "../../convex/_generated/api"
import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  validateAttachmentFile,
} from "@/lib/attachment-limits"
import type { ComposerAttachment } from "@/stores/types"
import type { ConvexReactClient } from "convex/react"

export type AttachmentUploadClient = Pick<
  ConvexReactClient,
  "mutation" | "action"
>

function createLocalId() {
  return crypto.randomUUID()
}

export function createPreparingAttachment(file: File): ComposerAttachment | {
  error: string
} {
  const validated = validateAttachmentFile(file)
  if (!validated.ok) return { error: validated.error }

  return {
    localId: createLocalId(),
    filename: file.name,
    mimeType: validated.mimeType,
    kind: validated.kind,
    sizeBytes: file.size,
    status: "preparing",
    progress: 0,
    localPreviewUrl:
      validated.kind === "image" ? URL.createObjectURL(file) : undefined,
  }
}

async function putWithOptionalProgress(options: {
  putUrl: string
  file: File
  mimeType: string
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}) {
  const progressState = { sawProgress: false }
  try {
    await ky.put(options.putUrl, {
      body: options.file,
      headers: { "Content-Type": options.mimeType },
      signal: options.signal,
      timeout: false,
      retry: 0,
      onUploadProgress: (progress) => {
        progressState.sawProgress = true
        if (progress.totalBytes > 0) {
          options.onProgress?.(
            Math.min(1, progress.transferredBytes / progress.totalBytes)
          )
        }
      },
    })
    return { sawProgress: progressState.sawProgress }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error
    }
    if (
      progressState.sawProgress &&
      options.signal !== undefined &&
      !options.signal.aborted
    ) {
      // Explicit one-shot retry without progress (HTTP/2 progress quirks).
      await ky.put(options.putUrl, {
        body: options.file,
        headers: { "Content-Type": options.mimeType },
        signal: options.signal,
        timeout: false,
        retry: 0,
      })
      return { sawProgress: false }
    }
    throw error
  }
}

export async function uploadComposerAttachment(options: {
  convex: AttachmentUploadClient
  file: File
  attachment: ComposerAttachment
  signal?: AbortSignal
  onUpdate: (patch: Partial<ComposerAttachment>) => void
}) {
  const { convex, file, attachment, signal, onUpdate } = options
  let attachmentId = attachment.attachmentId

  try {
    const intent = await convex.mutation(api.attachments.createUploadIntent, {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })
    attachmentId = intent.attachmentId

    if (signal?.aborted) {
      await convex
        .mutation(api.attachments.discard, { attachmentId })
        .catch(() => undefined)
      throw new DOMException("Aborted", "AbortError")
    }

    onUpdate({
      attachmentId,
      status: "uploading",
      progress: 0,
    })

    const { putUrl, mimeType } = await convex.action(api.r2.getUploadUrl, {
      attachmentId,
    })

    await putWithOptionalProgress({
      putUrl,
      file,
      mimeType,
      signal,
      onProgress: (progress) => onUpdate({ progress }),
    })

    onUpdate({ status: "processing", progress: 1 })
    await convex.mutation(api.attachments.confirmUpload, { attachmentId })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (attachmentId) {
        await convex
          .mutation(api.attachments.discard, { attachmentId })
          .catch(() => undefined)
      }
      throw error
    }

    const message =
      error instanceof HTTPError
        ? "Upload failed"
        : error instanceof Error
          ? error.message
          : "Upload failed"
    onUpdate({ status: "failed", errorMessage: message })
  }
}

export function assertAttachmentCapacity(
  currentCount: number,
  incomingCount: number
) {
  if (currentCount + incomingCount > MAX_ATTACHMENTS_PER_MESSAGE) {
    return `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files`
  }
  return null
}
