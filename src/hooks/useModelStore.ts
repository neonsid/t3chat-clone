import { useSyncExternalStore } from "react"
import { useConvexAuth, useMutation, useQuery } from "convex/react"

import { api } from "../../convex/_generated/api"
import {
  DEFAULT_MODEL_PREFERENCES,
  getModelStoreServerState,
  getModelStoreState,
  subscribeToModelStore,
} from "@/lib/model-store"
import type { ModelStoreState } from "@/lib/model-store"

export function useModelStore(): ModelStoreState & {
  selectModel: (modelId: string) => void
  toggleFavorite: (modelId: string) => void
  setCombineResults: (combineResults: boolean) => void
} {
  const { isAuthenticated } = useConvexAuth()
  const transient = useSyncExternalStore(
    subscribeToModelStore,
    getModelStoreState,
    getModelStoreServerState
  )
  const storedPreferences = useQuery(
    api.preferences.get,
    isAuthenticated ? {} : "skip"
  )
  const preferences: {
    selectedModelId: string
    favoriteModelIds: ReadonlyArray<string>
    combineResults: boolean
  } = storedPreferences ?? DEFAULT_MODEL_PREFERENCES
  const updatePreferences = useMutation(api.preferences.update)

  function save(next: {
    selectedModelId: string
    favoriteModelIds: ReadonlyArray<string>
    combineResults: boolean
  }) {
    if (!isAuthenticated) return
    void updatePreferences({
      selectedModelId: next.selectedModelId,
      favoriteModelIds: [...next.favoriteModelIds],
      combineResults: next.combineResults,
    })
  }

  return {
    ...preferences,
    ...transient,
    selectModel(modelId) {
      save({ ...preferences, selectedModelId: modelId })
    },
    toggleFavorite(modelId) {
      const favoriteModelIds = preferences.favoriteModelIds.includes(modelId)
        ? preferences.favoriteModelIds.filter((id) => id !== modelId)
        : [...preferences.favoriteModelIds, modelId]
      save({ ...preferences, favoriteModelIds })
    },
    setCombineResults(combineResults) {
      save({ ...preferences, combineResults })
    },
  }
}
