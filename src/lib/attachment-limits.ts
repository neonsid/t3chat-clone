/**
 * Client-side attachment allowlists and limits.
 * Keep in sync with `convex/attachmentConstants.ts`.
 */

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

export const ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,.jpg,.jpeg,.png,.gif,.webp,.pdf"

export type AttachmentKind = "image" | "pdf"

export const MIME_TO_KIND = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
} as const satisfies Record<AllowedAttachmentMimeType, AttachmentKind>

export function isAllowedAttachmentMimeType(
  mimeType: string
): mimeType is AllowedAttachmentMimeType {
  return ALLOWED_ATTACHMENT_MIME_TYPES.some((allowed) => allowed === mimeType)
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
  const mimeType = normalizeAttachmentMimeType(file)
  if (!mimeType) {
    return {
      ok: false,
      error: "Only JPEG, PNG, GIF, WebP, and PDF files are supported",
    }
  }
  if (file.size <= 0) {
    return { ok: false, error: "File is empty" }
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: `File exceeds the ${Math.floor(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB limit`,
    }
  }
  return { ok: true, mimeType, kind: MIME_TO_KIND[mimeType] }
}
