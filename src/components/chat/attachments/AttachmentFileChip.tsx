import { XIcon } from "lucide-react"

import { ATTACHMENT_FILE_CHIP } from "@/components/chat/attachments/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { cn } from "@/lib/utils"

export function AttachmentFileChip({
  filename,
  badge = "PDF",
  statusLabel,
  failed,
  warning,
  onOpen,
  onRemove,
  removeDisabled,
}: {
  filename: string
  badge?: string
  statusLabel?: string
  failed?: boolean
  warning?: boolean
  onOpen?: () => void
  onRemove?: () => void
  removeDisabled?: boolean
}) {
  const label = (
    <>
      <span className={ATTACHMENT_FILE_CHIP.badge}>{badge}</span>
      <span className={ATTACHMENT_FILE_CHIP.filename} title={filename}>
        {filename}
      </span>
    </>
  )

  const body = (
    <div
      className={cn(
        ATTACHMENT_FILE_CHIP.root,
        failed
          ? "border-destructive/40"
          : warning
            ? "border-amber-500/50"
            : null
      )}
    >
      {onOpen ? (
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
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${filename}`}
          disabled={removeDisabled}
          onClick={onRemove}
          className={ATTACHMENT_FILE_CHIP.remove}
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  )

  if ((failed || warning) && statusLabel) {
    return <Tooltip content={statusLabel}>{body}</Tooltip>
  }

  return body
}
