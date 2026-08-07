import type {
  ModelCapability,
  ModelCatalogEntry,
  ModelProviderId,
} from "@t3chat/model-catalog"

import {
  CHAT_MODEL_CATALOG,
  DEFAULT_CHAT_MODEL_ID,
  DEFAULT_FAVORITE_MODEL_IDS,
} from "@/lib/chat-models"

export type ModelRailTab = "favorites" | ModelProviderId

export type ModelStoreState = {
  readonly selectedModelId: string
  readonly favoriteModelIds: ReadonlyArray<string>
  readonly combineResults: boolean
  readonly search: string
  readonly capabilities: ReadonlyArray<ModelCapability>
  readonly railTab: ModelRailTab
}

export const DEFAULT_MODEL_PREFERENCES = {
  selectedModelId: DEFAULT_CHAT_MODEL_ID,
  favoriteModelIds: DEFAULT_FAVORITE_MODEL_IDS,
  combineResults: true,
}

const modelsById = new Map<string, ModelCatalogEntry>(
  CHAT_MODEL_CATALOG.map((model) => [model.id, model])
)

const initialTransientState = {
  search: "",
  capabilities: [] as ReadonlyArray<ModelCapability>,
  railTab: "favorites" as ModelRailTab,
}
let transientState = initialTransientState
const listeners = new Set<() => void>()

function setTransientState(patch: Partial<typeof transientState>) {
  transientState = { ...transientState, ...patch }
  listeners.forEach((listener) => listener())
}

export function subscribeToModelStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getModelStoreState() {
  return transientState
}

export function getModelStoreServerState() {
  return initialTransientState
}

export function getModelById(modelId: string): ModelCatalogEntry | null {
  return modelsById.get(modelId) ?? null
}

export const modelStore = {
  setSearch(search: string) {
    setTransientState({ search })
  },
  setRailTab(railTab: ModelRailTab) {
    setTransientState({ railTab })
  },
  toggleCapability(capability: ModelCapability) {
    const capabilities = transientState.capabilities.includes(capability)
      ? transientState.capabilities.filter((id) => id !== capability)
      : [...transientState.capabilities, capability]
    setTransientState({ capabilities })
  },
  clearFilters() {
    setTransientState({ search: "", capabilities: [] })
  },
}
