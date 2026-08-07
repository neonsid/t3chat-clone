import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useShallow } from "zustand/react/shallow"

import { api } from "../../convex/_generated/api"
import {
  DEFAULT_MODEL_PREFERENCES,
  MAX_FAVORITE_MODELS,
} from "@/stores/constants"
import { usePreferencesStore } from "@/stores/AppStateProvider"
import type { ModelPreferences } from "@/stores/types"

type ModelPreferenceActions = {
  selectModel: (modelId: string) => void
  toggleFavorite: (modelId: string) => void
  setCombineResults: (combineResults: boolean) => void
}

export function useModelPreferences(): ModelPreferences &
  ModelPreferenceActions {
  const { isAuthenticated } = useConvexAuth()
  const guest = usePreferencesStore(
    useShallow((state) => ({
      preferences: state.guestModels,
      selectModel: state.selectGuestModel,
      toggleFavorite: state.toggleGuestFavorite,
      setCombineResults: state.setGuestCombineResults,
    }))
  )
  const storedPreferences = useQuery(
    api.preferences.get,
    isAuthenticated ? {} : "skip"
  )
  const updatePreferences = useMutation(
    api.preferences.update
  ).withOptimisticUpdate((localStore, next) => {
    const current = localStore.getQuery(api.preferences.get, {})
    if (current === undefined) return
    localStore.setQuery(api.preferences.get, {}, next)
  })
  const preferences = isAuthenticated
    ? (storedPreferences ?? DEFAULT_MODEL_PREFERENCES)
    : guest.preferences

  function saveAuthenticated(next: ModelPreferences): void {
    void updatePreferences({
      selectedModelId: next.selectedModelId,
      favoriteModelIds: [...next.favoriteModelIds],
      combineResults: next.combineResults,
    })
  }

  return {
    ...preferences,
    selectModel(modelId) {
      if (isAuthenticated) {
        saveAuthenticated({ ...preferences, selectedModelId: modelId })
      } else {
        guest.selectModel(modelId)
      }
    },
    toggleFavorite(modelId) {
      if (!isAuthenticated) {
        guest.toggleFavorite(modelId)
        return
      }
      const favoriteModelIds = preferences.favoriteModelIds.includes(modelId)
        ? preferences.favoriteModelIds.filter((id) => id !== modelId)
        : [...preferences.favoriteModelIds, modelId].slice(
            0,
            MAX_FAVORITE_MODELS
          )
      saveAuthenticated({ ...preferences, favoriteModelIds })
    },
    setCombineResults(combineResults) {
      if (isAuthenticated) {
        saveAuthenticated({ ...preferences, combineResults })
      } else {
        guest.setCombineResults(combineResults)
      }
    },
  }
}
