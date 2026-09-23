import { useEffect, useRef } from "react"

import {
  ATTACHMENT_UPLOAD_TOAST,
  ATTACHMENT_UPLOAD_TOAST_ID,
} from "@/components/chat/attachments/constants"
import { showShellToast } from "@/components/chat/shell/shell-toast"
import {
  DOCX_MIME_TYPE,
  TXT_MIME_TYPE,
  normalizeAttachmentMimeType,
} from "@/lib/attachment-limits"
import type { ComposerAttachment } from "@/stores/types"

export function useComposerUploadToast(attachments: Array<ComposerAttachment>) {
  const uploadToastActive = useRef(false)
  const busyUploading = attachments.some(
    (attachment) =>
      attachment.status === "preparing" ||
      attachment.status === "uploading" ||
      attachment.status === "processing"
  )
  const allSettled =
    attachments.length > 0 &&
    attachments.every(
      (attachment) =>
        attachment.status === "ready" || attachment.status === "failed"
    )

  useEffect(() => {
    if (!uploadToastActive.current || busyUploading || !allSettled) return
    uploadToastActive.current = false
    const failedCount = attachments.filter(
      (attachment) => attachment.status === "failed"
    ).length
    let title: string = ATTACHMENT_UPLOAD_TOAST.ready
    if (failedCount > 0) {
      title =
        attachments.length === 1
          ? ATTACHMENT_UPLOAD_TOAST.failed
          : ATTACHMENT_UPLOAD_TOAST.someFailed
    }
    showShellToast({
      id: ATTACHMENT_UPLOAD_TOAST_ID,
      title,
      status: failedCount > 0 ? "error" : "success",
      duration: 2800,
    })
  }, [allSettled, attachments, busyUploading])

  function markBatchStarted(files: FileList | File[]) {
    const fileCount = Array.from(files).filter((file) => {
      const mime = normalizeAttachmentMimeType(file)
      return (
        mime === "application/pdf" ||
        mime === DOCX_MIME_TYPE ||
        mime === TXT_MIME_TYPE
      )
    }).length
    if (fileCount === 0) return
    uploadToastActive.current = true
    showShellToast({
      id: ATTACHMENT_UPLOAD_TOAST_ID,
      title: ATTACHMENT_UPLOAD_TOAST.uploading(fileCount),
      status: "loading",
      duration: 0,
    })
  }

  return { markBatchStarted }
}
