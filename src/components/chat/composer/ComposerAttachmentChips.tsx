import { useState } from "react"

import { AttachmentFileChip } from "@/components/chat/attachments/AttachmentFileChip"
import { AttachmentLightbox } from "@/components/chat/attachments/AttachmentLightbox"
import { AttachmentThumbnail } from "@/components/chat/attachments/AttachmentThumbnail"
import type { ComposerAttachment } from "@/stores/types"

function composerStatusLabel(attachment: ComposerAttachment) {
  if (attachment.kind === "image" && attachment.status !== "failed") {
    return undefined
  }
  if (attachment.status === "failed") {
    return attachment.errorMessage ?? "Failed"
  }
  if (attachment.status === "processing") return "Processing…"
  return undefined
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
  const [viewer, setViewer] = useState<{
    localId: string
    filename: string
    url: string
  } | null>(null)

  if (attachments.length === 0) return null

  return (
    <>
      <ul className="mb-2 flex w-fit max-w-full flex-wrap gap-2 overflow-visible">
        {attachments.map((attachment) => {
          const previewUrl = attachment.localPreviewUrl
          const canOpen = attachment.kind === "image" && Boolean(previewUrl)

          const progress =
            attachment.status === "processing"
              ? 1
              : attachment.status === "preparing" ||
                  attachment.status === "uploading"
                ? attachment.progress
                : undefined
          const indeterminate =
            attachment.status === "preparing" ||
            (attachment.status === "uploading" && attachment.progress <= 0)
          const onRemoveChip = () => {
            if (viewer?.localId === attachment.localId) setViewer(null)
            onRemove(attachment.localId)
          }

          return (
            <li key={attachment.localId} className="max-w-full min-w-0">
              {attachment.kind === "pdf" ? (
                <AttachmentFileChip
                  filename={attachment.filename}
                  statusLabel={composerStatusLabel(attachment)}
                  failed={attachment.status === "failed"}
                  progress={progress}
                  indeterminate={indeterminate}
                  onOpen={
                    previewUrl
                      ? () =>
                          window.open(
                            previewUrl,
                            "_blank",
                            "noopener,noreferrer"
                          )
                      : undefined
                  }
                  onRemove={onRemoveChip}
                  removeDisabled={disabled}
                />
              ) : (
                <AttachmentThumbnail
                  filename={attachment.filename}
                  kind={attachment.kind}
                  src={previewUrl}
                  statusLabel={composerStatusLabel(attachment)}
                  failed={attachment.status === "failed"}
                  showPercent={
                    attachment.status !== "ready" &&
                    attachment.status !== "failed"
                  }
                  progress={progress}
                  indeterminate={indeterminate}
                  onOpen={
                    canOpen && previewUrl
                      ? () =>
                          setViewer({
                            localId: attachment.localId,
                            filename: attachment.filename,
                            url: previewUrl,
                          })
                      : undefined
                  }
                  onRemove={onRemoveChip}
                  removeDisabled={disabled}
                />
              )}
            </li>
          )
        })}
      </ul>
      {viewer ? (
        <AttachmentLightbox
          open
          filename={viewer.filename}
          url={viewer.url}
          onOpenChange={(open) => {
            if (!open) setViewer(null)
          }}
        />
      ) : null}
    </>
  )
}
