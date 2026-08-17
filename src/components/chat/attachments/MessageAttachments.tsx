import { useState } from "react"
import { useAction } from "convex/react"

import { api } from "../../../../convex/_generated/api"
import { AttachmentFileChip } from "@/components/chat/attachments/AttachmentFileChip"
import { AttachmentLightbox } from "@/components/chat/attachments/AttachmentLightbox"
import { AttachmentThumbnail } from "@/components/chat/attachments/AttachmentThumbnail"
import type { ThreadMessageAttachment } from "@/components/chat/attachments/types"
import {
  attachmentPreviewUrl,
  rememberAttachmentPreview,
} from "@/lib/attachment-preview-cache"
import { useMountEffect } from "@/hooks/useMountEffect"

export type { ThreadMessageAttachment }

function RemoteAttachmentThumb({
  attachment,
  onOpen,
}: {
  attachment: ThreadMessageAttachment
  onOpen: (url: string) => void
}) {
  const getDownloadUrl = useAction(api.r2.getDownloadUrl)
  const cachedUrl =
    attachment.src ?? attachmentPreviewUrl(attachment.attachmentId)
  const [fetchedUrl, setFetchedUrl] = useState<string>()
  const url = cachedUrl ?? fetchedUrl

  useMountEffect(() => {
    if (cachedUrl) {
      rememberAttachmentPreview(attachment.attachmentId, cachedUrl)
      return
    }
    let cancelled = false
    void getDownloadUrl({
      attachmentId: attachment.attachmentId,
      purpose: "ui",
    })
      .then((result) => {
        if (cancelled) return
        rememberAttachmentPreview(attachment.attachmentId, result.url)
        setFetchedUrl(result.url)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  })

  if (attachment.kind === "pdf") {
    return (
      <AttachmentFileChip
        filename={attachment.filename}
        onOpen={
          url
            ? () => window.open(url, "_blank", "noopener,noreferrer")
            : undefined
        }
      />
    )
  }

  return (
    <AttachmentThumbnail
      filename={attachment.filename}
      kind={attachment.kind}
      src={url}
      onOpen={url ? () => onOpen(url) : undefined}
    />
  )
}

export function MessageAttachments({
  attachments,
}: {
  attachments: Array<ThreadMessageAttachment>
}) {
  const [viewer, setViewer] = useState<{
    filename: string
    url: string
  } | null>(null)

  if (attachments.length === 0) return null

  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <li key={attachment.attachmentId}>
            <RemoteAttachmentThumb
              attachment={attachment}
              onOpen={(url) =>
                setViewer({ filename: attachment.filename, url })
              }
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
