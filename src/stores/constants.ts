import {
  DEFAULT_CHAT_MODEL_ID,
  DEFAULT_FAVORITE_MODEL_IDS,
} from "@/lib/chat-models"
import type { ModelPreferences, ThreadComposerState } from "@/stores/types"

export const CHAT_UI_STORAGE_KEY = "t3chat-chat-ui"
export const CHAT_UI_STORAGE_VERSION = 2
export const GUEST_MODEL_PREFERENCES_STORAGE_KEY =
  "t3chat-guest-model-preferences"
export const GUEST_MODEL_PREFERENCES_STORAGE_VERSION = 1
export const MAX_FAVORITE_MODELS = 4

export const DEFAULT_THREAD_COMPOSER_STATE: ThreadComposerState = Object.freeze(
  {
    draft: "",
    reasoningEffort: "instant",
    searchEnabled: false,
    attachments: [],
  }
)

export const DEFAULT_MODEL_PREFERENCES: ModelPreferences = Object.freeze({
  selectedModelId: DEFAULT_CHAT_MODEL_ID,
  favoriteModelIds: DEFAULT_FAVORITE_MODEL_IDS,
  combineResults: true,
})
