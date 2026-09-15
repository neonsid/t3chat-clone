import { BanIcon, XIcon } from "lucide-react"

import { AttachmentShell } from "@/components/chat/attachments/AttachmentShell"
import {
  ATTACHMENT_FILE_CHIP,
  ATTACHMENT_THUMBNAIL_ACTION,
  ATTACHMENT_UPLOAD_PROGRESS,
  attachmentUploadPercent,
} from "@/components/chat/attachments/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { cn } from "@/lib/utils"

export function AttachmentFileChip({
  filename,
  badge = "PDF",
  statusLabel,
  failed,
  warning,
  uploading,
  progress,
  onOpen,
  onRemove,
  removeDisabled,
}: {
  filename: string
  badge?: string
  statusLabel?: string
  failed?: boolean
  warning?: boolean
  uploading?: boolean
  progress?: number
  onOpen?: () => void
  onRemove?: () => void
  removeDisabled?: boolean
}) {
  const percent = attachmentUploadPercent(progress)
  const removeLabel = uploading
    ? ATTACHMENT_THUMBNAIL_ACTION.cancelLabel
    : ATTACHMENT_THUMBNAIL_ACTION.removeLabel

  const label = (
    <span
      className={cn(
        ATTACHMENT_FILE_CHIP.content,
        uploading && ATTACHMENT_FILE_CHIP.contentUploading
      )}
    >
      <span className={ATTACHMENT_FILE_CHIP.badge}>{badge}</span>
      <span className={ATTACHMENT_FILE_CHIP.filename} title={filename}>
        {filename}
      </span>
    </span>
  )

  const body = (
    <AttachmentShell
      className="group/upload relative"
      failed={failed}
      warning={warning}
    >
      <div className={ATTACHMENT_FILE_CHIP.root}>
        {onOpen && !uploading ? (
          <button
            type="button"
            className={ATTACHMENT_FILE_CHIP.open}
            aria-label={`Open ${filename}`}
            onClick={onOpen}
          >
            {label}
          </button>
        ) : (
          label
        )}
        {uploading ? (
          <>
            <div className={ATTACHMENT_UPLOAD_PROGRESS.overlayClass}>
              <span className={ATTACHMENT_UPLOAD_PROGRESS.percentClass}>
                {percent}%
              </span>
            </div>
            <div className={ATTACHMENT_UPLOAD_PROGRESS.trackClass}>
              <div
                className={ATTACHMENT_UPLOAD_PROGRESS.fillClass}
                style={{ width: `${percent}%` }}
              />
            </div>
          </>
        ) : null}
      </div>
      {onRemove ? (
        <Tooltip
          wrapperClassName={ATTACHMENT_FILE_CHIP.actionWrap}
          content={removeLabel}
        >
          <button
            type="button"
            aria-label={removeLabel}
            disabled={removeDisabled}
            onClick={onRemove}
            className={ATTACHMENT_THUMBNAIL_ACTION.button}
          >
            {uploading ? (
              <BanIcon className="size-3" />
            ) : (
              <XIcon className="size-3" />
            )}
          </button>
        </Tooltip>
      ) : null}
    </AttachmentShell>
  )

  if ((failed || warning) && statusLabel) {
    return <Tooltip content={statusLabel}>{body}</Tooltip>
  }

  return body
}
