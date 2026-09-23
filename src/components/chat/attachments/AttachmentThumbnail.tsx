import { FileTextIcon } from "lucide-react"

import {
  AttachmentRemoveButton,
  UploadProgressOverlay,
} from "@/components/chat/attachments/AttachmentFileChip"
import { AttachmentShell } from "@/components/chat/attachments/AttachmentShell"
import { attachmentUploadPercent } from "@/components/chat/attachments/constants"
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
      <img src={src} alt="" className="h-8 w-auto max-w-full object-cover" />
    ) : (
      <div className="flex size-full items-center justify-center text-muted-foreground">
        <FileTextIcon className="size-5" />
      </div>
    )

  const chip = (
    <AttachmentShell className="group/upload relative" failed={failed}>
      <div className="flex h-8 w-fit max-w-full shrink-0">
        <div
          className={cn(
            "relative h-full w-fit overflow-hidden rounded-md bg-foreground/80",
            "shadow-[0_8px_18px_rgb(0_0_0/0.35)]"
          )}
        >
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
                "pointer-events-none absolute inset-x-0 bottom-0 truncate px-1 py-0.5",
                "text-center text-[10px] leading-4",
                failed
                  ? "bg-destructive/80 text-destructive-foreground"
                  : "bg-background/80 text-muted-foreground"
              )}
            >
              {statusLabel}
            </p>
          ) : null}
          {showPercent ? (
            <UploadProgressOverlay percent={percent} wash />
          ) : null}
        </div>
      </div>
      {onRemove ? (
        <AttachmentRemoveButton
          uploading={isUploading}
          disabled={removeDisabled}
          onClick={onRemove}
        />
      ) : null}
    </AttachmentShell>
  )

  if (failed && statusLabel) {
    return <Tooltip content={statusLabel}>{chip}</Tooltip>
  }

  return chip
}
