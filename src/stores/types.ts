import type { ReasoningEffort } from "@/lib/chat-models"
import type { AttachmentKind } from "@/lib/attachment-limits"

export type ComposerAttachmentStatus =
  | "preparing"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"

export type ComposerAttachment = {
  localId: string
  attachmentId?: string
  filename: string
  mimeType: string
  kind: AttachmentKind
  sizeBytes: number
  status: ComposerAttachmentStatus
  progress: number
  errorMessage?: string
  localPreviewUrl?: string
}

export type ThreadComposerState = {
  draft: string
  reasoningEffort: ReasoningEffort
  searchEnabled: boolean
  attachments: Array<ComposerAttachment>
}

export type ModelPreferences = {
  selectedModelId: string
  favoriteModelIds: ReadonlyArray<string>
  combineResults: boolean
}
