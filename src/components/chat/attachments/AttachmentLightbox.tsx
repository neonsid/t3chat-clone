import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { DownloadIcon, ExternalLinkIcon, XIcon } from "lucide-react"

import { ATTACHMENT_VIEWER } from "@/components/chat/attachments/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { hasDocument } from "@/lib/runtime-env"
import { cn } from "@/lib/utils"

async function downloadNamedFile(url: string, filename: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error("Download failed")
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = objectUrl
    link.download = filename
    link.click()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

const iconButtonClassName = cn(
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-md border",
  "border-border/70 bg-muted text-muted-foreground",
  "hover:bg-accent hover:text-foreground"
)

export function AttachmentLightbox({
  open,
  filename,
  url,
  onOpenChange,
}: {
  open: boolean
  filename: string
  url: string
  onOpenChange: (open: boolean) => void
}) {
  const [container] = useState<HTMLElement | null>(() =>
    hasDocument() ? document.body : null
  )
  const [popupEl, setPopupEl] = useState<HTMLDivElement | null>(null)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop
          data-attachment-lightbox=""
          className="fixed inset-0 z-[300] bg-background/80"
        />
        <Dialog.Popup
          ref={setPopupEl}
          data-attachment-lightbox=""
          className={cn(
            "pointer-events-none fixed inset-0 z-[300] flex items-center justify-center",
            "outline-none"
          )}
        >
          <div
            className={cn(
              "pointer-events-auto flex w-max max-w-[min(56rem,calc(100vw-3rem))] flex-col",
              "max-h-[calc(100vh-3rem)] overflow-hidden rounded-md border border-border bg-card",
              "shadow-[0_16px_48px_rgb(0_0_0/0.4)]"
            )}
          >
            <div className="flex w-full shrink-0 items-center justify-between gap-4 px-5 py-3">
              <Dialog.Title className="min-w-0 flex-1 truncate text-sm text-foreground">
                {filename}
              </Dialog.Title>
              <div className="flex shrink-0 items-center gap-2">
                <Tooltip
                  content={ATTACHMENT_VIEWER.downloadLabel}
                  portalContainer={popupEl}
                >
                  <button
                    type="button"
                    aria-label={ATTACHMENT_VIEWER.downloadLabel}
                    className={iconButtonClassName}
                    onClick={() => {
                      void downloadNamedFile(url, filename)
                    }}
                  >
                    <DownloadIcon className="size-4" />
                  </button>
                </Tooltip>
                <Tooltip
                  content={ATTACHMENT_VIEWER.openLabel}
                  portalContainer={popupEl}
                >
                  <button
                    type="button"
                    aria-label={ATTACHMENT_VIEWER.openLabel}
                    className={iconButtonClassName}
                    onClick={() => {
                      window.open(url, "_blank", "noopener,noreferrer")
                    }}
                  >
                    <ExternalLinkIcon className="size-4" />
                  </button>
                </Tooltip>
                <Tooltip
                  content={ATTACHMENT_VIEWER.closeLabel}
                  portalContainer={popupEl}
                >
                  <Dialog.Close
                    render={
                      <button
                        type="button"
                        aria-label={ATTACHMENT_VIEWER.closeLabel}
                        className={iconButtonClassName}
                      />
                    }
                  >
                    <XIcon className="size-4" />
                  </Dialog.Close>
                </Tooltip>
              </div>
            </div>
            <div className="flex min-h-0 items-center justify-center overflow-hidden px-5 pb-5">
              <img
                src={url}
                alt={filename}
                className={cn(
                  "h-auto w-auto object-contain",
                  "max-h-[calc(100vh-9rem)] max-w-[min(56rem,calc(100vw-5.5rem))]"
                )}
              />
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
