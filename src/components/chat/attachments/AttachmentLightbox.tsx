import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { DownloadIcon, ExternalLinkIcon, XIcon } from "lucide-react"

import { Button } from "@/components/shared/ui/button"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { ATTACHMENT_VIEWER } from "@/components/chat/attachments/constants"

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
    typeof document === "undefined" ? null : document.body
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop
          data-attachment-lightbox=""
          className="fixed inset-0 z-[300] bg-background/90"
        />
        <Dialog.Popup
          data-attachment-lightbox=""
          className="fixed inset-0 z-[300] flex flex-col outline-none"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Dialog.Title className="min-w-0 flex-1 truncate text-sm text-foreground">
              {filename}
            </Dialog.Title>
            <div className="flex shrink-0 items-center gap-1">
              <Tooltip content={ATTACHMENT_VIEWER.downloadLabel} side="bottom">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={ATTACHMENT_VIEWER.downloadLabel}
                  onClick={() => {
                    void downloadNamedFile(url, filename)
                  }}
                >
                  <DownloadIcon />
                </Button>
              </Tooltip>
              <Tooltip content={ATTACHMENT_VIEWER.openLabel} side="bottom">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={ATTACHMENT_VIEWER.openLabel}
                  onClick={() => {
                    window.open(url, "_blank", "noopener,noreferrer")
                  }}
                >
                  <ExternalLinkIcon />
                </Button>
              </Tooltip>
              <Tooltip content={ATTACHMENT_VIEWER.closeLabel} side="bottom">
                <Dialog.Close
                  render={
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={ATTACHMENT_VIEWER.closeLabel}
                    />
                  }
                >
                  <XIcon />
                </Dialog.Close>
              </Tooltip>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <img
              src={url}
              alt={filename}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
