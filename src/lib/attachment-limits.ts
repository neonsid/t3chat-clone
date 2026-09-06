/**
 * Client-side attachment allowlists and limits.
 * Keep in sync with `convex/attachmentConstants.ts`.
 */

export const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export const LEGACY_DOC_MIME_TYPE = "application/msword"

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
export const MAX_ATTACHMENTS_PER_MESSAGE = 5
export const MAX_ATTACHMENT_FILENAME_LENGTH = 200

export const ATTACHMENT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  DOCX_MIME_TYPE,
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".docx",
].join(",")

export const ATTACHMENT_UNSUPPORTED_ERROR =
  "Only JPEG, PNG, GIF, WebP, PDF, and Word (.docx) files are supported"

export const LEGACY_DOC_ERROR = "Save as .docx and try again"

export type AttachmentKind = "image" | "pdf" | "docx"

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

export function isLegacyWordFilename(filename: string) {
  const lower = filename.toLowerCase()
  return lower.endsWith(".doc") && !lower.endsWith(".docx")
}

export function maxBytesForAttachmentKind(kind: AttachmentKind) {
  return kind === "docx" ? MAX_WORD_ATTACHMENT_BYTES : MAX_ATTACHMENT_BYTES
}

export function normalizeAttachmentMimeType(
  file: Pick<File, "type" | "name">
): AllowedAttachmentMimeType | null {
  if (isAllowedAttachmentMimeType(file.type)) return file.type

  const lower = file.name.toLowerCase()
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".gif")) return "image/gif"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".docx")) return DOCX_MIME_TYPE
  return null
}

export function validateAttachmentFile(file: File):
  | {
      ok: true
      mimeType: AllowedAttachmentMimeType
      kind: AttachmentKind
    }
  | {
      ok: false
      error: string
    } {
  if (
    isLegacyWordFilename(file.name) ||
    file.type === LEGACY_DOC_MIME_TYPE
  ) {
    return { ok: false, error: LEGACY_DOC_ERROR }
  }

  const mimeType = normalizeAttachmentMimeType(file)
  if (!mimeType) {
    return {
      ok: false,
      error: ATTACHMENT_UNSUPPORTED_ERROR,
    }
  }
  if (file.size <= 0) {
    return { ok: false, error: "File is empty" }
  }
  const kind = MIME_TO_KIND[mimeType]
  const maxBytes = maxBytesForAttachmentKind(kind)
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File exceeds the ${Math.floor(maxBytes / (1024 * 1024))}MB limit`,
    }
  }
  return { ok: true, mimeType, kind }
}
