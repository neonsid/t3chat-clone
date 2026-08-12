import { FileTextIcon, XIcon } from "lucide-react"

import type { ComposerAttachment } from "@/stores/types"
import { cn } from "@/lib/utils"

function statusLabel(attachment: ComposerAttachment) {
  switch (attachment.status) {
    case "preparing":
      return "Preparing…"
    case "uploading":
      return attachment.progress > 0
        ? `${Math.round(attachment.progress * 100)}%`
        : "Uploading…"
    case "processing":
      return "Processing…"
    case "ready":
      return "Ready"
    case "failed":
      return attachment.errorMessage ?? "Failed"
  }
}

export function ComposerAttachmentChips({
  attachments,
  onRemove,
  disabled,
}: {
  attachments: Array<ComposerAttachment>
  onRemove: (localId: string) => void
  disabled?: boolean
}) {
  if (attachments.length === 0) return null

  return (
    <ul className="mb-3 flex flex-wrap gap-2">
      {attachments.map((attachment) => {
        const percent =
          attachment.status === "uploading"
            ? Math.round(attachment.progress * 100)
            : attachment.status === "ready" ||
                attachment.status === "processing"
              ? 100
              : 0
        const indeterminate =
          attachment.status === "preparing" ||
          attachment.status === "processing" ||
          (attachment.status === "uploading" && attachment.progress <= 0)

        return (
          <li
            key={attachment.localId}
            className={cn(
              "relative flex max-w-[11rem] items-center gap-2 overflow-hidden rounded-xl border border-border/70 bg-background/70 pe-1 ps-1.5 py-1",
              attachment.status === "failed" && "border-destructive/40"
            )}
          >
            <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
              {attachment.kind === "image" && attachment.localPreviewUrl ? (
                <img
                  src={attachment.localPreviewUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <FileTextIcon className="size-4" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 py-0.5">
              <p className="truncate text-xs text-muted-foreground">
                {attachment.filename}
              </p>
              <p
                className={cn(
                  "text-[11px] tabular-nums",
                  attachment.status === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground/80"
                )}
              >
                {statusLabel(attachment)}
              </p>
              {attachment.status !== "ready" &&
              attachment.status !== "failed" ? (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-border/80">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary/70 transition-[width]",
                      indeterminate && "w-1/3 animate-pulse"
                    )}
                    style={
                      indeterminate ? undefined : { width: `${percent}%` }
                    }
                  />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              aria-label={`Remove ${attachment.filename}`}
              disabled={disabled}
              onClick={() => onRemove(attachment.localId)}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <XIcon className="size-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
