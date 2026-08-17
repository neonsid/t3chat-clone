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

function uploadErrorMessage(error: Error) {
  if (!error.message) return "Upload failed"
  const message = error.message
  if (
    message.length > 48 ||
    /https?:\/\//i.test(message) ||
    /network error/i.test(message)
  ) {
    return "Upload failed"
  }
  return message
}

export function createPreparingAttachment(file: File):
  | ComposerAttachment
  | {
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

function putFileToSignedUrl(options: {
  putUrl: string
  file: File
  mimeType: string
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const onAbort = () => {
      xhr.abort()
    }

    xhr.open("PUT", options.putUrl)
    xhr.setRequestHeader("Content-Type", options.mimeType)
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return
      options.onProgress?.(Math.min(1, event.loaded / event.total))
    }
    xhr.onload = () => {
      options.signal?.removeEventListener("abort", onAbort)
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error("Upload failed"))
    }
    xhr.onerror = () => {
      options.signal?.removeEventListener("abort", onAbort)
      reject(new Error("Upload failed"))
    }
    xhr.onabort = () => {
      options.signal?.removeEventListener("abort", onAbort)
      reject(new DOMException("Aborted", "AbortError"))
    }

    if (options.signal) {
      if (options.signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"))
        return
      }
      options.signal.addEventListener("abort", onAbort)
    }

    xhr.send(options.file)
  })
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
      onUpdate({ status: "failed", errorMessage: "Upload cancelled" })
      return
    }

    onUpdate({
      attachmentId,
      status: "uploading",
      progress: 0,
    })

    const { putUrl, mimeType } = await convex.action(api.r2.getUploadUrl, {
      attachmentId,
    })

    await putFileToSignedUrl({
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
      onUpdate({ status: "failed", errorMessage: "Upload cancelled" })
      return
    }

    onUpdate({
      status: "failed",
      errorMessage:
        error instanceof Error ? uploadErrorMessage(error) : "Upload failed",
    })
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
