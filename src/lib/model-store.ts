import { MODEL_CATALOG } from "@t3chat/model-catalog"
import type {
  ModelCapability,
  ModelCatalogEntry,
  ModelProviderId,
} from "@t3chat/model-catalog"

export type ModelRailTab = "favorites" | ModelProviderId

export type ModelStoreState = {
  readonly selectedModelId: string
  readonly favoriteModelIds: ReadonlyArray<string>
  readonly combineResults: boolean
  readonly search: string
  readonly capabilities: ReadonlyArray<ModelCapability>
  readonly railTab: ModelRailTab
}

const STORAGE_KEY = "t3chat.models.v1"
const DEFAULT_SELECTED_MODEL_ID = "openai/gpt-5.6-terra"
const DEFAULT_FAVORITE_MODEL_IDS = [
  "openai/gpt-5.6-terra",
  "anthropic/claude-sonnet-5",
  "google/gemini-3.5-flash",
  "xai/grok-4.5",
  "deepseek/deepseek-v4-pro",
  "moonshotai/kimi-k3",
  "zai/glm-5",
]

const modelsById = new Map<string, ModelCatalogEntry>(
  MODEL_CATALOG.map((model) => [model.id, model])
)

function knownModelIds(ids: ReadonlyArray<string>): string[] {
  return ids.filter((id) => modelsById.has(id))
}

function createInitialState(): ModelStoreState {
  return {
    selectedModelId: modelsById.has(DEFAULT_SELECTED_MODEL_ID)
      ? DEFAULT_SELECTED_MODEL_ID
      : (MODEL_CATALOG[0]?.id ?? ""),
    favoriteModelIds: knownModelIds(DEFAULT_FAVORITE_MODEL_IDS),
    combineResults: true,
    search: "",
    capabilities: [],
    railTab: "favorites",
  }
}

type PersistedState = Pick<
  ModelStoreState,
  "selectedModelId" | "favoriteModelIds" | "combineResults"
>

function loadPersistedState(): ModelStoreState {
  const initial = createInitialState()
  if (typeof window === "undefined") return initial

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial

    const parsed = JSON.parse(raw) as Partial<PersistedState>
    const favoriteModelIds = Array.isArray(parsed.favoriteModelIds)
      ? knownModelIds(
          parsed.favoriteModelIds.filter(
            (id): id is string => typeof id === "string"
          )
        )
      : initial.favoriteModelIds

    return {
      ...initial,
      selectedModelId:
        typeof parsed.selectedModelId === "string" &&
        modelsById.has(parsed.selectedModelId)
          ? parsed.selectedModelId
          : initial.selectedModelId,
      favoriteModelIds,
      combineResults:
        typeof parsed.combineResults === "boolean"
          ? parsed.combineResults
          : initial.combineResults,
    }
  } catch {
    return initial
  }
}

function persist(state: ModelStoreState) {
  if (typeof window === "undefined") return

  const payload: PersistedState = {
    selectedModelId: state.selectedModelId,
    favoriteModelIds: state.favoriteModelIds,
    combineResults: state.combineResults,
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Storage may be unavailable in private browsing or when its quota is full.
  }
}

const serverState = createInitialState()
let state = loadPersistedState()
const listeners = new Set<() => void>()

function setState(patch: Partial<ModelStoreState>) {
  const next = { ...state, ...patch }
  if (
    next.selectedModelId === state.selectedModelId &&
    next.favoriteModelIds === state.favoriteModelIds &&
    next.combineResults === state.combineResults &&
    next.search === state.search &&
    next.capabilities === state.capabilities &&
    next.railTab === state.railTab
  ) {
    return
  }

  state = next
  persist(state)
  listeners.forEach((listener) => listener())
}

export function subscribeToModelStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getModelStoreState(): ModelStoreState {
  return state
}

export function getModelStoreServerState(): ModelStoreState {
  return serverState
}

export function getModelById(modelId: string): ModelCatalogEntry | null {
  return modelsById.get(modelId) ?? null
}

export const modelStore = {
  selectModel(modelId: string) {
    if (modelsById.has(modelId)) setState({ selectedModelId: modelId })
  },
  toggleFavorite(modelId: string) {
    if (!modelsById.has(modelId)) return
    const favoriteModelIds = state.favoriteModelIds.includes(modelId)
      ? state.favoriteModelIds.filter((id) => id !== modelId)
      : [...state.favoriteModelIds, modelId]
    setState({ favoriteModelIds })
  },
  setSearch(search: string) {
    setState({ search })
  },
  setRailTab(railTab: ModelRailTab) {
    setState({ railTab })
  },
  toggleCapability(capability: ModelCapability) {
    const capabilities = state.capabilities.includes(capability)
      ? state.capabilities.filter((id) => id !== capability)
      : [...state.capabilities, capability]
    setState({ capabilities })
  },
  setCombineResults(combineResults: boolean) {
    setState({ combineResults })
  },
  clearFilters() {
    setState({ search: "", capabilities: [] })
  },
}
