import type { ReasoningEffort } from "@/lib/chat-models"

export type ThreadComposerState = {
  draft: string
  reasoningEffort: ReasoningEffort
  searchEnabled: boolean
}

export type ModelPreferences = {
  selectedModelId: string
  favoriteModelIds: ReadonlyArray<string>
  combineResults: boolean
}
