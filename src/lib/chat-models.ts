import { MODEL_CATALOG } from "@t3chat/model-catalog"
import type { ModelCatalogEntry } from "@t3chat/model-catalog"

export const REASONING_EFFORTS = ["instant", "low", "medium", "high"] as const
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]
export type OpenAIReasoningEffort =
  "none" | "minimal" | "low" | "medium" | "high"

type ChatModelConfig = {
  adapterModelId: "gpt-5.5" | "gpt-5.5-pro" | "gpt-5.4-mini" | "gpt-5.4-nano"
  supportedReasoningEfforts: ReadonlyArray<ReasoningEffort>
  instantReasoningEffort?: Extract<OpenAIReasoningEffort, "none" | "minimal">
}

const ALL_REASONING_EFFORTS = REASONING_EFFORTS

/**
 * The app-specific executable model registry. Catalog metadata stays in the
 * shared package; this registry only describes the adapters installed here.
 */
export const CHAT_MODEL_CONFIG = {
  "openai/gpt-5.5": {
    adapterModelId: "gpt-5.5",
    supportedReasoningEfforts: ALL_REASONING_EFFORTS,
    instantReasoningEffort: "none",
  },
  "openai/gpt-5.5-pro": {
    adapterModelId: "gpt-5.5-pro",
    supportedReasoningEfforts: ["high"],
  },
  "openai/gpt-5.4-mini": {
    adapterModelId: "gpt-5.4-mini",
    supportedReasoningEfforts: ALL_REASONING_EFFORTS,
    instantReasoningEffort: "minimal",
  },
  "openai/gpt-5.4-nano": {
    adapterModelId: "gpt-5.4-nano",
    supportedReasoningEfforts: ALL_REASONING_EFFORTS,
    instantReasoningEffort: "minimal",
  },
} as const satisfies Record<string, ChatModelConfig>

export type ChatModelId = keyof typeof CHAT_MODEL_CONFIG

const chatModelIds = new Set<string>(Object.keys(CHAT_MODEL_CONFIG))

export const CHAT_MODEL_CATALOG = MODEL_CATALOG.filter(
  (model): model is ModelCatalogEntry & { id: ChatModelId } =>
    chatModelIds.has(model.id)
)

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "openai/gpt-5.5"
export const DEFAULT_FAVORITE_MODEL_IDS: ReadonlyArray<ChatModelId> = [
  "openai/gpt-5.5",
  "openai/gpt-5.5-pro",
  "openai/gpt-5.4-mini",
]
export const MAX_MODEL_OUTPUT_TOKENS = 16_384
export const MAX_MODEL_CONTEXT_CHARACTERS = 500_000

export function isChatModelId(value: string): value is ChatModelId {
  return value in CHAT_MODEL_CONFIG
}

export function resolveChatModel(
  modelId: string,
  reasoningEffort: ReasoningEffort
) {
  if (!isChatModelId(modelId)) return null
  const config: ChatModelConfig = CHAT_MODEL_CONFIG[modelId]
  if (!config.supportedReasoningEfforts.includes(reasoningEffort)) return null

  return {
    id: modelId,
    ...config,
    providerReasoningEffort:
      reasoningEffort === "instant"
        ? config.instantReasoningEffort
        : reasoningEffort,
  }
}
