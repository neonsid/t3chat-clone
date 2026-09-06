/**
 * Attachment allowlists and limits.
 * Keep in sync with `src/lib/attachment-limits.ts`.
 */

export const ATTACHMENT_KIND = {
  image: "image",
  pdf: "pdf",
  docx: "docx",
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

export const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export const LEGACY_DOC_MIME_TYPE = "application/msword"

/** Allowed MIME types (images, PDF, Word). */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  DOCX_MIME_TYPE,
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
  ".docx",
] as const

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
export const MAX_WORD_ATTACHMENT_BYTES = 5 * 1024 * 1024
export const MAX_DOCX_EXTRACTED_CHARS = 200_000
export const ATTACHMENT_UNSUPPORTED_ERROR =
  "Only JPEG, PNG, GIF, WebP, PDF, and Word (.docx) files are supported"
export const LEGACY_DOC_ERROR = "Save as .docx and try again"
export const MAX_ATTACHMENTS_PER_MESSAGE = 5
export const MAX_ATTACHMENT_FILENAME_LENGTH = 200
export const MAX_ATTACHMENT_ID_LENGTH = 80

/** Presigned PUT TTL (~10 minutes). */
export const ATTACHMENT_PUT_URL_TTL_SECONDS = 10 * 60
/** Signed GET for UI previews (~1 hour). */
export const ATTACHMENT_GET_URL_UI_TTL_SECONDS = 60 * 60
/** Signed GET for model providers (~15 minutes). */
export const ATTACHMENT_GET_URL_MODEL_TTL_SECONDS = 15 * 60
/** Reuse a minted model URL until it has less than two minutes left. */
export const ATTACHMENT_MODEL_URL_REUSE_MIN_REMAINING_MS = 120_000

export function canReuseModelDownloadUrl(expiresAt: number, now: number) {
  return expiresAt - now > ATTACHMENT_MODEL_URL_REUSE_MIN_REMAINING_MS
}

/** Unbound attachment expiry window (app GC). R2 lifecycle must be longer. */
export const ATTACHMENT_UNBOUND_TTL_MS = 24 * 60 * 60 * 1000

export const ATTACHMENT_DELETE_BATCH_SIZE = 32
export const ATTACHMENT_GC_BATCH_SIZE = 64

export const MIME_TO_KIND = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
  [DOCX_MIME_TYPE]: "docx",
} as const satisfies Record<AllowedAttachmentMimeType, AttachmentKind>

export function isAllowedAttachmentMimeType(
  mimeType: string
): mimeType is AllowedAttachmentMimeType {
  return ALLOWED_ATTACHMENT_MIME_TYPES.some((allowed) => allowed === mimeType)
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
    case DOCX_MIME_TYPE:
      return ".docx"
  }
}

export function maxBytesForAttachmentKind(kind: AttachmentKind) {
  return kind === "docx" ? MAX_WORD_ATTACHMENT_BYTES : MAX_ATTACHMENT_BYTES
}

export function isLegacyWordFilename(filename: string) {
  const lower = filename.toLowerCase()
  return lower.endsWith(".doc") && !lower.endsWith(".docx")
}
