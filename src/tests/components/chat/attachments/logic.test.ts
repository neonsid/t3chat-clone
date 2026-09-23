import { describe, expect, it } from "vitest"

import { resolveComposerAttachmentPresentation } from "@/components/chat/attachments/logic"
import { ATTACHMENT_THUMBNAIL_ACTION } from "@/components/chat/attachments/constants"
import type { ComposerAttachment } from "@/stores/types"

function attachment(
  patch: Partial<ComposerAttachment> &
    Pick<ComposerAttachment, "localId" | "filename" | "kind" | "status">
): ComposerAttachment {
  return {
    mimeType: "application/pdf",
    sizeBytes: 12,
    progress: 0,
    ...patch,
  }
}

describe("resolveComposerAttachmentPresentation", () => {
  it("treats preparing, uploading, and processing as an in-flight chip", () => {
    const preparing = resolveComposerAttachmentPresentation(
      attachment({
        localId: "1",
        filename: "notes.pdf",
        kind: "pdf",
        status: "preparing",
        progress: 0,
      })
    )
    const processing = resolveComposerAttachmentPresentation(
      attachment({
        localId: "2",
        filename: "notes.pdf",
        kind: "pdf",
        status: "processing",
        progress: 0.4,
      })
    )

    expect(preparing.isUploading).toBe(true)
    expect(preparing.progress).toBe(0)
    expect(preparing.removeLabel).toBe(ATTACHMENT_THUMBNAIL_ACTION.cancelLabel)
    expect(processing.isUploading).toBe(true)
    expect(processing.progress).toBe(1)
    expect(processing.statusLabel).toBe("Processing…")
  })

  it("opens images with a preview and keeps files on the chip", () => {
    const image = resolveComposerAttachmentPresentation(
      attachment({
        localId: "img",
        filename: "shot.png",
        kind: "image",
        mimeType: "image/png",
        status: "ready",
        progress: 1,
        localPreviewUrl: "blob:preview",
      })
    )
    const file = resolveComposerAttachmentPresentation(
      attachment({
        localId: "pdf",
        filename: "brief.pdf",
        kind: "pdf",
        status: "ready",
        progress: 1,
      })
    )

    expect(image.canOpen).toBe(true)
    expect(file.canOpen).toBe(false)
    expect(file.badge).toBe("PDF")
    expect(file.removeLabel).toBe(ATTACHMENT_THUMBNAIL_ACTION.removeLabel)
  })

  it("surfaces failed and context-warning copy on file chips only", () => {
    const failed = resolveComposerAttachmentPresentation(
      attachment({
        localId: "fail",
        filename: "notes.pdf",
        kind: "pdf",
        status: "failed",
        errorMessage: "Too large",
      })
    )
    const warned = resolveComposerAttachmentPresentation(
      attachment({
        localId: "warn",
        filename: "notes.txt",
        kind: "txt",
        status: "ready",
        progress: 1,
        contextWarning: "This file is long",
      })
    )
    const failedImage = resolveComposerAttachmentPresentation(
      attachment({
        localId: "img-fail",
        filename: "shot.png",
        kind: "image",
        mimeType: "image/png",
        status: "failed",
        errorMessage: "Broken image",
      })
    )

    expect(failed.failed).toBe(true)
    expect(failed.fileStatusLabel).toBe("Too large")
    expect(warned.warning).toBe(true)
    expect(warned.fileStatusLabel).toBe("This file is long")
    expect(warned.badge).toBe("TXT")
    expect(failedImage.statusLabel).toBe("Broken image")
    expect(failedImage.fileStatusLabel).toBe("Broken image")
  })
})
