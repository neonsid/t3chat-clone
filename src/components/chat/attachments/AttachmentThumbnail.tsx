import { BanIcon, FileTextIcon, XIcon } from "lucide-react"

import { AttachmentShell } from "@/components/chat/attachments/AttachmentShell"
import {
  ATTACHMENT_FILE_CHIP,
  ATTACHMENT_THUMBNAIL_ACTION,
  ATTACHMENT_THUMBNAIL_CLASS,
  ATTACHMENT_THUMBNAIL_FRAME_CLASS,
  ATTACHMENT_UPLOAD_PROGRESS,
  attachmentUploadPercent,
} from "@/components/chat/attachments/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { cn } from "@/lib/utils"

export function AttachmentThumbnail({
  filename,
  kind,
  src,
  statusLabel,
  failed,
  progress,
  showPercent,
  onOpen,
  onRemove,
  removeDisabled,
}: {
  filename: string
  kind: "image" | "pdf"
  src?: string
  statusLabel?: string
  failed?: boolean
  progress?: number
  showPercent?: boolean
  onOpen?: () => void
  onRemove?: () => void
  removeDisabled?: boolean
}) {
  const percent = attachmentUploadPercent(progress)
  const isUploading = Boolean(
    showPercent || (progress !== undefined && progress < 1)
  )
  const preview =
    kind === "image" && src ? (
      <img
        src={src}
        alt=""
        className={
          isUploading
            ? ATTACHMENT_UPLOAD_PROGRESS.imageUploadingClass
            : ATTACHMENT_UPLOAD_PROGRESS.imageClass
        }
      />
    ) : (
      <div className="flex size-full items-center justify-center text-muted-foreground">
        <FileTextIcon className="size-5" />
      </div>
    )

  const body = (
    <AttachmentShell className="group/upload relative" failed={failed}>
      <div className={ATTACHMENT_THUMBNAIL_CLASS}>
        <div className={ATTACHMENT_THUMBNAIL_FRAME_CLASS}>
          {onOpen && !isUploading ? (
            <button
              type="button"
              className="block h-8 w-auto max-w-full cursor-zoom-in"
              aria-label={`View ${filename}`}
              onClick={onOpen}
            >
              {preview}
            </button>
          ) : (
            preview
          )}
          {statusLabel ? (
            <p
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 truncate px-1 py-0.5 text-center text-[10px] leading-4",
                failed
                  ? "bg-destructive/80 text-destructive-foreground"
                  : "bg-background/80 text-muted-foreground"
              )}
            >
              {statusLabel}
            </p>
          ) : null}
          {showPercent ? (
            <>
              <div
                className={cn(
                  ATTACHMENT_UPLOAD_PROGRESS.overlayClass,
                  ATTACHMENT_UPLOAD_PROGRESS.imageWashClass
                )}
              >
                <span className={ATTACHMENT_UPLOAD_PROGRESS.percentClass}>
                  {`${percent}%`}
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
      </div>
      {onRemove ? (
        <Tooltip
          wrapperClassName={ATTACHMENT_FILE_CHIP.actionWrap}
          content={
            isUploading
              ? ATTACHMENT_THUMBNAIL_ACTION.cancelLabel
              : ATTACHMENT_THUMBNAIL_ACTION.removeLabel
          }
        >
          <button
            type="button"
            aria-label={
              isUploading
                ? ATTACHMENT_THUMBNAIL_ACTION.cancelLabel
                : ATTACHMENT_THUMBNAIL_ACTION.removeLabel
            }
            disabled={removeDisabled}
            onClick={onRemove}
            className={ATTACHMENT_THUMBNAIL_ACTION.button}
          >
            {isUploading ? (
              <BanIcon className="size-3" />
            ) : (
              <XIcon className="size-3" />
            )}
          </button>
        </Tooltip>
      ) : null}
    </AttachmentShell>
  )

  if (failed && statusLabel) {
    return <Tooltip content={statusLabel}>{body}</Tooltip>
  }

  return body
}
