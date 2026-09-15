import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { DownloadIcon, ExternalLinkIcon, XIcon } from "lucide-react"

import { ATTACHMENT_VIEWER } from "@/components/chat/attachments/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { hasDocument } from "@/lib/runtime-env"

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
    hasDocument() ? document.body : null
  )
  const [popupEl, setPopupEl] = useState<HTMLDivElement | null>(null)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop
          data-attachment-lightbox=""
          className={ATTACHMENT_VIEWER.backdrop}
        />
        <Dialog.Popup
          ref={setPopupEl}
          data-attachment-lightbox=""
          className={ATTACHMENT_VIEWER.popup}
        >
          <div className={ATTACHMENT_VIEWER.frame}>
            <div className={ATTACHMENT_VIEWER.header}>
              <Dialog.Title className={ATTACHMENT_VIEWER.title}>
                {filename}
              </Dialog.Title>
              <div className={ATTACHMENT_VIEWER.actions}>
                <Tooltip
                  content={ATTACHMENT_VIEWER.downloadLabel}
                  portalContainer={popupEl}
                >
                  <button
                    type="button"
                    aria-label={ATTACHMENT_VIEWER.downloadLabel}
                    className={ATTACHMENT_VIEWER.iconButton}
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
                    className={ATTACHMENT_VIEWER.iconButton}
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
                        className={ATTACHMENT_VIEWER.iconButton}
                      />
                    }
                  >
                    <XIcon className="size-4" />
                  </Dialog.Close>
                </Tooltip>
              </div>
            </div>
            <div className={ATTACHMENT_VIEWER.imageWrap}>
              <img
                src={url}
                alt={filename}
                className={ATTACHMENT_VIEWER.image}
              />
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
