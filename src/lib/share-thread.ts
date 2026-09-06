import type { UIMessage } from "@tanstack/ai-react"

import type { Doc } from "../../convex/_generated/dataModel"
import type { ThreadMessageAttachment } from "@/components/chat/attachments/types"
import type { AssistantGenerationStats } from "@/lib/threads"
import { toAssistantGenerationStats } from "@/lib/threads"

export const SHARE_VIEWED_STORAGE_PREFIX = "t3chat.share.viewed."

export function shareViewedStorageKey(publicId: string) {
  return `${SHARE_VIEWED_STORAGE_PREFIX}${publicId}`
}

export function toShareUiMessage(message: {
  messageId: string
  role: "user" | "assistant"
  content?: string
  thinking?: string
  createdAt: number
}): UIMessage {
  return {
    id: message.messageId,
    role: message.role,
    parts: [
      ...(message.thinking
        ? [{ type: "thinking" as const, content: message.thinking }]
        : []),
      ...(message.content
        ? [{ type: "text" as const, content: message.content }]
        : []),
    ],
    createdAt: new Date(message.createdAt),
  }
}

export function toShareAttachments(
  attachments: ReadonlyArray<{
    attachmentId: string
    messageId: string
    filename: string
    kind: ThreadMessageAttachment["kind"]
  }>,
  urls: Record<string, string>
): Array<ThreadMessageAttachment> {
  return attachments.map((attachment) => ({
    attachmentId: attachment.attachmentId,
    messageId: attachment.messageId,
    filename: attachment.filename,
    kind: attachment.kind,
    src: urls[attachment.attachmentId],
    hideDownload: true,
  }))
}

export function toShareGenerationStats(
  generation: NonNullable<Doc<"messages">["generation"]>
): AssistantGenerationStats | undefined {
  return toAssistantGenerationStats({ generation }) ?? undefined
}
