/**
 * Attachment allowlists and limits.
 * Keep in sync with `src/lib/attachment-limits.ts`.
 */

export const ATTACHMENT_KIND = {
  image: "image",
  pdf: "pdf",
} as const

export type AttachmentKind =
  (typeof ATTACHMENT_KIND)[keyof typeof ATTACHMENT_KIND]

export const ATTACHMENT_STATUS = {
  pending_upload: "pending_upload",
  uploaded: "uploaded",
  processing: "processing",
  ready: "ready",
  failed: "failed",
  deleting: "deleting",
} as const

export type AttachmentStatus =
  (typeof ATTACHMENT_STATUS)[keyof typeof ATTACHMENT_STATUS]

export const ATTACHMENT_BINDING_STATUS = {
  unbound: "unbound",
  bound: "bound",
} as const

export type AttachmentBindingStatus =
  (typeof ATTACHMENT_BINDING_STATUS)[keyof typeof ATTACHMENT_BINDING_STATUS]

/** Allowed MIME types for v1 (images + PDF only). */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const

export type AllowedAttachmentMimeType =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number]

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
] as const

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
export const MAX_ATTACHMENTS_PER_MESSAGE = 5
export const MAX_ATTACHMENT_FILENAME_LENGTH = 200
export const MAX_ATTACHMENT_ID_LENGTH = 80

/** Presigned PUT TTL (~10 minutes). */
export const ATTACHMENT_PUT_URL_TTL_SECONDS = 10 * 60
/** Signed GET for UI previews (~1 hour). */
export const ATTACHMENT_GET_URL_UI_TTL_SECONDS = 60 * 60
/** Signed GET for model providers (~15 minutes). */
export const ATTACHMENT_GET_URL_MODEL_TTL_SECONDS = 15 * 60

/** Unbound attachment expiry window (app GC). R2 lifecycle must be longer. */
export const ATTACHMENT_UNBOUND_TTL_MS = 24 * 60 * 60 * 1000

export const ATTACHMENT_DELETE_BATCH_SIZE = 32
export const ATTACHMENT_GC_BATCH_SIZE = 64

export const MIME_TO_KIND: Record<AllowedAttachmentMimeType, AttachmentKind> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
}

export function isAllowedAttachmentMimeType(
  mimeType: string
): mimeType is AllowedAttachmentMimeType {
  return (ALLOWED_ATTACHMENT_MIME_TYPES as ReadonlyArray<string>).includes(
    mimeType
  )
}

export function extensionForMimeType(
  mimeType: AllowedAttachmentMimeType
): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg"
    case "image/png":
      return ".png"
    case "image/gif":
      return ".gif"
    case "image/webp":
      return ".webp"
    case "application/pdf":
      return ".pdf"
  }
}
