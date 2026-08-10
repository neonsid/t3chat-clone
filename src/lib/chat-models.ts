import { MODEL_CATALOG } from "@t3chat/model-catalog"
import type { ModelCatalogEntry } from "@t3chat/model-catalog"

export const REASONING_EFFORTS = ["instant", "low", "medium", "high"] as const
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]

export function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return (
    typeof value === "string" &&
    REASONING_EFFORTS.some((effort) => effort === value)
  )
}
export type ProviderReasoningEffort =
  "none" | "minimal" | Exclude<ReasoningEffort, "instant">

export type ChatModelRuntime =
  | {
      readonly kind: "openai"
      readonly adapterModelId: string
    }
  | {
      readonly kind: "google"
      readonly adapterModelId: string
    }
  | {
      readonly kind: "openrouter"
      readonly adapterModelId: string
      readonly variant?: "nitro"
    }

export type ChatModelConfig = {
  readonly runtime: ChatModelRuntime
  readonly supportedReasoningEfforts: ReadonlyArray<ReasoningEffort>
  readonly defaultReasoningEffort: ReasoningEffort
  readonly instantReasoningEffort?: Extract<
    ProviderReasoningEffort,
    "none" | "minimal"
  >
}

const ALL_REASONING_EFFORTS = REASONING_EFFORTS
const INSTANT_ONLY = ["instant"] as const

const OPENAI_CHAT_MODEL_CONFIG = {
  "openai/gpt-5.6": openAIModel("gpt-5.6"),
  "openai/gpt-5.6-luna": openAIModel("gpt-5.6-luna"),
  "openai/gpt-5.6-terra": openAIModel("gpt-5.6-terra"),
  "openai/gpt-5.5": openAIModel("gpt-5.5"),
  "openai/gpt-5.5-pro": openAIProModel("gpt-5.5-pro", "high"),
  "openai/gpt-5.4": openAIModel("gpt-5.4"),
  "openai/gpt-5.4-pro": openAIProModel("gpt-5.4-pro", "medium"),
  "openai/gpt-5.4-mini": openAIModel("gpt-5.4-mini"),
  "openai/gpt-5.4-nano": openAIModel("gpt-5.4-nano"),
} as const satisfies Record<string, ChatModelConfig>

const GOOGLE_ADAPTER_MODEL_IDS = {
  "google/gemini-3.6-flash": "gemini-3.6-flash",
  "google/gemini-3.5-flash": "gemini-3.5-flash",
  "google/gemini-3.5-flash-lite": "gemini-3.5-flash-lite",
  "google/gemini-flash-latest": "gemini-flash-latest",
  "google/gemini-3.1-flash-lite": "gemini-3.1-flash-lite",
  "google/gemini-flash-lite-latest": "gemini-flash-lite-latest",
  "google/gemini-3.1-flash-lite-preview": "gemini-3.1-flash-lite-preview",
  "google/gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
  "google/gemini-3.1-pro-preview-customtools":
    "gemini-3.1-pro-preview-customtools",
  "google/gemma-4-26b-a4b-it": "gemma-4-26b-a4b-it",
  "google/gemma-4-31b-it": "gemma-4-31b-it",
} as const

const OPENROUTER_ADAPTER_MODELS = {
  "anthropic/claude-opus-5": { adapterModelId: "anthropic/claude-opus-5" },
  "anthropic/claude-sonnet-5": {
    adapterModelId: "anthropic/claude-sonnet-5",
  },
  "anthropic/claude-fable-5": {
    adapterModelId: "anthropic/claude-fable-5",
  },
  "anthropic/claude-opus-4-8": {
    adapterModelId: "anthropic/claude-opus-4.8",
  },
  "anthropic/claude-opus-4-7": {
    adapterModelId: "anthropic/claude-opus-4.7",
  },
  "anthropic/claude-opus-4-6": {
    adapterModelId: "anthropic/claude-opus-4.6",
  },
  "anthropic/claude-sonnet-4-6": {
    adapterModelId: "anthropic/claude-sonnet-4.6",
  },
  "xai/grok-4.5": { adapterModelId: "x-ai/grok-4.5" },
  "xai/grok-4.3": { adapterModelId: "x-ai/grok-4.3" },
  "xai/grok-build-0.1": { adapterModelId: "x-ai/grok-build-0.1" },
  "xai/grok-4.20-0309-non-reasoning": {
    adapterModelId: "x-ai/grok-4.20",
  },
  "xai/grok-4.20-0309-reasoning": {
    adapterModelId: "x-ai/grok-4.20",
  },
  "deepseek/deepseek-v4-flash": {
    adapterModelId: "deepseek/deepseek-v4-flash",
  },
  "deepseek/deepseek-v4-pro": {
    adapterModelId: "deepseek/deepseek-v4-pro",
  },
  "deepseek/deepseek-chat": { adapterModelId: "deepseek/deepseek-chat" },
  "deepseek/deepseek-reasoner": {
    adapterModelId: "deepseek/deepseek-r1",
  },
  "moonshotai/kimi-k3": { adapterModelId: "moonshotai/kimi-k3" },
  "moonshotai/kimi-k2.7-code": {
    adapterModelId: "moonshotai/kimi-k2.7-code",
  },
  "moonshotai/kimi-k2.7-code-highspeed": {
    adapterModelId: "moonshotai/kimi-k2.7-code",
    variant: "nitro",
  },
  "moonshotai/kimi-k2.6": { adapterModelId: "moonshotai/kimi-k2.6" },
  "alibaba/qwen3.7-plus": { adapterModelId: "qwen/qwen3.7-plus" },
  "alibaba/qwen3.7-max": { adapterModelId: "qwen/qwen3.7-max" },
  "alibaba/qwen3.6-flash": { adapterModelId: "qwen/qwen3.6-flash" },
  "alibaba/qwen3.6-27b": { adapterModelId: "qwen/qwen3.6-27b" },
  "alibaba/qwen3.6-max-preview": {
    adapterModelId: "qwen/qwen3.6-max-preview",
  },
  "alibaba/qwen3.6-35b-a3b": {
    adapterModelId: "qwen/qwen3.6-35b-a3b",
  },
  "alibaba/qwen3.6-plus": { adapterModelId: "qwen/qwen3.6-plus" },
  "alibaba/qwen3.5-122b-a10b": {
    adapterModelId: "qwen/qwen3.5-122b-a10b",
  },
  "alibaba/qwen3.5-27b": { adapterModelId: "qwen/qwen3.5-27b" },
  "alibaba/qwen3.5-35b-a3b": {
    adapterModelId: "qwen/qwen3.5-35b-a3b",
  },
  "alibaba/qwen3.5-plus": {
    adapterModelId: "qwen/qwen3.5-plus-20260420",
  },
  "alibaba/qwen3.5-397b-a17b": {
    adapterModelId: "qwen/qwen3.5-397b-a17b",
  },
  "zai/glm-5.2": { adapterModelId: "z-ai/glm-5.2" },
  "zai/glm-5.1": { adapterModelId: "z-ai/glm-5.1" },
  "zai/glm-5v-turbo": { adapterModelId: "z-ai/glm-5v-turbo" },
  "zai/glm-5-turbo": { adapterModelId: "z-ai/glm-5-turbo" },
  "zai/glm-5": { adapterModelId: "z-ai/glm-5" },
  "minimax/MiniMax-M3": { adapterModelId: "minimax/minimax-m3" },
  "minimax/MiniMax-M2.7": { adapterModelId: "minimax/minimax-m2.7" },
  "minimax/MiniMax-M2.7-highspeed": {
    adapterModelId: "minimax/minimax-m2.7",
    variant: "nitro",
  },
  "minimax/MiniMax-M2.5-highspeed": {
    adapterModelId: "minimax/minimax-m2.5",
    variant: "nitro",
  },
  "minimax/MiniMax-M2.5": { adapterModelId: "minimax/minimax-m2.5" },
  "mistral/mistral-medium-latest": {
    adapterModelId: "mistralai/mistral-medium-3-5",
  },
  "mistral/mistral-medium-2604": {
    adapterModelId: "mistralai/mistral-medium-3-5",
  },
  "mistral/mistral-small-latest": {
    adapterModelId: "mistralai/mistral-small-2603",
  },
  "mistral/mistral-small-2603": {
    adapterModelId: "mistralai/mistral-small-2603",
  },
  "cohere/north-mini-code-1-0": {
    adapterModelId: "cohere/north-mini-code:free",
  },
} as const

export type ChatModelId =
  | keyof typeof OPENAI_CHAT_MODEL_CONFIG
  | keyof typeof GOOGLE_ADAPTER_MODEL_IDS
  | keyof typeof OPENROUTER_ADAPTER_MODELS

const catalogModelsById = new Map(
  MODEL_CATALOG.map((model) => [model.id, model])
)

function openAIModel(adapterModelId: string): ChatModelConfig {
  return {
    runtime: { kind: "openai", adapterModelId },
    supportedReasoningEfforts: ALL_REASONING_EFFORTS,
    defaultReasoningEffort: "instant",
    instantReasoningEffort: "none",
  }
}

function openAIProModel(
  adapterModelId: string,
  defaultReasoningEffort: Extract<ReasoningEffort, "medium" | "high">
): ChatModelConfig {
  return {
    runtime: { kind: "openai", adapterModelId },
    supportedReasoningEfforts: ["medium", "high"],
    defaultReasoningEffort,
  }
}

function reasoningProfileFor(
  modelId: string,
  instantReasoningEffort: "none" | "minimal"
): Pick<
  ChatModelConfig,
  | "supportedReasoningEfforts"
  | "defaultReasoningEffort"
  | "instantReasoningEffort"
> {
  const model = catalogModelsById.get(modelId)
  if (!model?.capabilities.includes("effort-control")) {
    return {
      supportedReasoningEfforts: INSTANT_ONLY,
      defaultReasoningEffort: "instant",
    }
  }

  return {
    supportedReasoningEfforts: ALL_REASONING_EFFORTS,
    defaultReasoningEffort: "instant",
    instantReasoningEffort,
  }
}

const GOOGLE_CHAT_MODEL_CONFIG = Object.fromEntries(
  Object.entries(GOOGLE_ADAPTER_MODEL_IDS).map(([modelId, adapterModelId]) => [
    modelId,
    {
      runtime: { kind: "google", adapterModelId },
      ...reasoningProfileFor(modelId, "minimal"),
    },
  ])
) as Record<keyof typeof GOOGLE_ADAPTER_MODEL_IDS, ChatModelConfig>

const OPENROUTER_CHAT_MODEL_CONFIG = Object.fromEntries(
  Object.entries(OPENROUTER_ADAPTER_MODELS).map(([modelId, runtime]) => [
    modelId,
    {
      runtime: { kind: "openrouter", ...runtime },
      ...reasoningProfileFor(modelId, "none"),
    },
  ])
) as Record<keyof typeof OPENROUTER_ADAPTER_MODELS, ChatModelConfig>

/**
 * Browser-safe executable model registry. Server-only adapter instances and
 * API keys live in src/lib/server/chat-model-executors.server.ts.
 */
export const CHAT_MODEL_CONFIG: Readonly<Record<ChatModelId, ChatModelConfig>> =
  {
    ...OPENAI_CHAT_MODEL_CONFIG,
    ...GOOGLE_CHAT_MODEL_CONFIG,
    ...OPENROUTER_CHAT_MODEL_CONFIG,
  }

const chatModelIds = new Set<string>(Object.keys(CHAT_MODEL_CONFIG))

export const CHAT_MODEL_CATALOG = MODEL_CATALOG.filter(
  (model): model is ModelCatalogEntry & { id: ChatModelId } =>
    chatModelIds.has(model.id)
)

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "openai/gpt-5.5"
export const DEFAULT_FAVORITE_MODEL_IDS: ReadonlyArray<ChatModelId> = [
  "openai/gpt-5.5",
  "openai/gpt-5.4-mini",
  "google/gemini-3.1-flash-lite",
  "cohere/north-mini-code-1-0",
]
export const MAX_MODEL_OUTPUT_TOKENS = 16_384
export const MAX_MODEL_CONTEXT_CHARACTERS = 500_000

const chatModelsById = new Map<string, ModelCatalogEntry>(
  CHAT_MODEL_CATALOG.map((model) => [model.id, model])
)

export function isChatModelId(value: string): value is ChatModelId {
  return chatModelIds.has(value)
}

export function getChatModelById(modelId: string): ModelCatalogEntry | null {
  return chatModelsById.get(modelId) ?? null
}

export function resolveChatModel(
  modelId: string,
  reasoningEffort: ReasoningEffort
) {
  if (!isChatModelId(modelId)) return null
  const config = CHAT_MODEL_CONFIG[modelId]
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
