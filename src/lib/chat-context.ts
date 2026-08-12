import type {
  ContentPart,
  DocumentPart,
  ImagePart,
  ModelMessage,
} from "@tanstack/ai"

import { MAX_MODEL_CONTEXT_CHARACTERS } from "@/lib/chat-models"

export type ChatContextAttachment = {
  attachmentId: string
  kind: "image" | "pdf"
  mimeType: string
  filename: string
  sizeBytes: number
  /** Present when the API has minted a signed GET for model providers. */
  url?: string
}

export type ChatContextMessage = {
  role: "user" | "assistant"
  content: string
  thinking?: string
  attachments?: Array<ChatContextAttachment>
}

export function buildAttachmentParts(
  attachments: Array<ChatContextAttachment>
): Array<ImagePart | DocumentPart> {
  const parts: Array<ImagePart | DocumentPart> = []

  for (const attachment of attachments) {
    if (!attachment.url) continue
    if (attachment.kind === "image") {
      parts.push({
        type: "image",
        source: {
          type: "url",
          value: attachment.url,
          mimeType: attachment.mimeType,
        },
      })
      continue
    }

    parts.push({
      type: "document",
      source: {
        type: "url",
        value: attachment.url,
        mimeType: attachment.mimeType || "application/pdf",
      },
    })
  }

  return parts
}

export function contextToModelMessages(
  messages: Array<ChatContextMessage>
): ModelMessage[] {
  const selected: ModelMessage[] = []
  let characterCount = 0

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]

    const content = message.content.trim()
    const thinking = message.thinking?.trim() ?? ""
    const attachments = message.attachments ?? []
    const attachmentParts = buildAttachmentParts(attachments)
    if (!content && !thinking && attachmentParts.length === 0) continue

    const characterCost =
      content.length +
      thinking.length +
      attachments.reduce(
        (sum, attachment) => sum + attachment.filename.length + 32,
        0
      )
    if (
      selected.length > 0 &&
      characterCount + characterCost > MAX_MODEL_CONTEXT_CHARACTERS
    ) {
      break
    }

    let modelContent: string | Array<ContentPart> = content
    if (attachmentParts.length > 0) {
      const parts: Array<ContentPart> = []
      if (content) parts.push({ type: "text", content })
      parts.push(...attachmentParts)
      modelContent = parts
    } else if (!content && thinking) {
      modelContent = ""
    }

    selected.push({
      role: message.role,
      content: modelContent,
      ...(thinking ? { thinking: [{ content: thinking }] } : {}),
    })
    characterCount += characterCost
  }

  return selected.reverse()
}

export function contextRequiresVision(
  messages: Array<ChatContextMessage>
): boolean {
  return messages.some((message) =>
    (message.attachments ?? []).some(
      (attachment) => attachment.kind === "image"
    )
  )
}

export function contextRequiresPdf(
  messages: Array<ChatContextMessage>
): boolean {
  return messages.some((message) =>
    (message.attachments ?? []).some((attachment) => attachment.kind === "pdf")
  )
}
