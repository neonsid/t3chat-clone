import { useState } from "react"

import { AttachmentFileChip } from "@/components/chat/attachments/AttachmentFileChip"
import { AttachmentLightbox } from "@/components/chat/attachments/AttachmentLightbox"
import { AttachmentThumbnail } from "@/components/chat/attachments/AttachmentThumbnail"
import { resolveComposerAttachmentPresentation } from "@/components/chat/attachments/logic"
import type { ComposerAttachment } from "@/stores/types"

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
      <ul className="mb-2 flex max-w-full flex-wrap gap-1.5 overflow-visible">
        {attachments.map((attachment) => (
          <li key={attachment.localId} className="max-w-full min-w-0">
            <ComposerAttachmentItem
              attachment={attachment}
              disabled={disabled}
              onOpenImage={(url) =>
                setViewer({
                  localId: attachment.localId,
                  filename: attachment.filename,
                  url,
                })
              }
              onRemove={() => {
                if (viewer?.localId === attachment.localId) setViewer(null)
                onRemove(attachment.localId)
              }}
            />
          </li>
        ))}
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

function ComposerAttachmentItem({
  attachment,
  disabled,
  onOpenImage,
  onRemove,
}: {
  attachment: ComposerAttachment
  disabled?: boolean
  onOpenImage: (url: string) => void
  onRemove: () => void
}) {
  const presentation = resolveComposerAttachmentPresentation(attachment)

  if (attachment.kind === "image") {
    return (
      <AttachmentThumbnail
        filename={presentation.filename}
        kind={attachment.kind}
        src={presentation.previewUrl}
        statusLabel={presentation.statusLabel}
        failed={presentation.failed}
        showPercent={presentation.isUploading}
        progress={presentation.progress}
        onOpen={
          presentation.canOpen && presentation.previewUrl
            ? () => onOpenImage(presentation.previewUrl!)
            : undefined
        }
        onRemove={onRemove}
        removeDisabled={disabled}
      />
    )
  }

  return (
    <AttachmentFileChip
      filename={presentation.filename}
      badge={presentation.badge}
      statusLabel={presentation.fileStatusLabel}
      failed={presentation.failed}
      warning={presentation.warning}
      uploading={presentation.isUploading}
      progress={presentation.progress}
      onRemove={onRemove}
      removeDisabled={disabled}
    />
  )
}
