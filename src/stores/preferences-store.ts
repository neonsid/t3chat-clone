import { createStore } from "zustand/vanilla"
import type { StateCreator } from "zustand/vanilla"
import { devtools } from "zustand/middleware"

import { isChatModelId } from "@/lib/chat-models"
import {
  DEFAULT_COLOR_THEME_ID,
  applyTheme,
  readColorSchemePreference,
  readColorThemePreference,
  storeColorSchemePreference,
  storeColorThemePreference,
} from "@/lib/theme"
import type { ColorSchemePreference, ColorThemePreference } from "@/lib/theme"
import {
  DEFAULT_MODEL_PREFERENCES,
  GUEST_MODEL_PREFERENCES_STORAGE_KEY,
  GUEST_MODEL_PREFERENCES_STORAGE_VERSION,
  MAX_FAVORITE_MODELS,
} from "@/stores/constants"
import type { ModelPreferences } from "@/stores/types"

export type PreferencesState = {
  theme: ColorSchemePreference
  colorTheme: ColorThemePreference
  guestModels: ModelPreferences
  hydrateClientPreferences: () => void
  syncSystemTheme: () => void
  setTheme: (theme: ColorSchemePreference) => void
  setColorTheme: (colorTheme: ColorThemePreference) => void
  selectGuestModel: (modelId: string) => void
  toggleGuestFavorite: (modelId: string) => void
  setGuestCombineResults: (combineResults: boolean) => void
}

type StoredGuestModelPreferences = {
  version: number
  preferences: ModelPreferences
}

function sanitizeGuestPreferences(value: unknown): ModelPreferences {
  if (!value || typeof value !== "object") return DEFAULT_MODEL_PREFERENCES
  const candidate = value as Partial<ModelPreferences>
  const selectedModelId = candidate.selectedModelId
  if (!selectedModelId || !isChatModelId(selectedModelId)) {
    return DEFAULT_MODEL_PREFERENCES
  }

  const favoriteModelIds = Array.isArray(candidate.favoriteModelIds)
    ? [...new Set(candidate.favoriteModelIds)]
        .filter(
          (modelId): modelId is string =>
            typeof modelId === "string" && isChatModelId(modelId)
        )
        .slice(0, MAX_FAVORITE_MODELS)
    : [...DEFAULT_MODEL_PREFERENCES.favoriteModelIds]

  return {
    selectedModelId,
    favoriteModelIds,
    combineResults:
      typeof candidate.combineResults === "boolean"
        ? candidate.combineResults
        : DEFAULT_MODEL_PREFERENCES.combineResults,
  }
}

function readGuestPreferences(): ModelPreferences {
  try {
    const raw = window.localStorage.getItem(GUEST_MODEL_PREFERENCES_STORAGE_KEY)
    if (!raw) return DEFAULT_MODEL_PREFERENCES
    const stored = JSON.parse(raw) as Partial<StoredGuestModelPreferences>
    if (stored.version !== GUEST_MODEL_PREFERENCES_STORAGE_VERSION) {
      return DEFAULT_MODEL_PREFERENCES
    }
    return sanitizeGuestPreferences(stored.preferences)
  } catch {
    return DEFAULT_MODEL_PREFERENCES
  }
}

function storeGuestPreferences(preferences: ModelPreferences): void {
  try {
    const stored: StoredGuestModelPreferences = {
      version: GUEST_MODEL_PREFERENCES_STORAGE_VERSION,
      preferences,
    }
    window.localStorage.setItem(
      GUEST_MODEL_PREFERENCES_STORAGE_KEY,
      JSON.stringify(stored)
    )
  } catch {
    // The in-memory preference remains usable when storage is unavailable.
  }
}

export function createPreferencesStore() {
  const initializer: StateCreator<PreferencesState> = (set, get) => ({
    theme: "system",
    colorTheme: DEFAULT_COLOR_THEME_ID,
    guestModels: DEFAULT_MODEL_PREFERENCES,
    hydrateClientPreferences() {
      const theme = readColorSchemePreference()
      const colorTheme = readColorThemePreference()
      set({ theme, colorTheme, guestModels: readGuestPreferences() })
      applyTheme(theme, colorTheme)
    },
    syncSystemTheme() {
      if (get().theme === "system") applyTheme("system", get().colorTheme)
    },
    setTheme(theme) {
      set({ theme })
      storeColorSchemePreference(theme)
      applyTheme(theme, get().colorTheme)
    },
    setColorTheme(colorTheme) {
      set({ colorTheme })
      storeColorThemePreference(colorTheme)
      applyTheme(get().theme, colorTheme)
    },
    selectGuestModel(selectedModelId) {
      if (!isChatModelId(selectedModelId)) return
      const guestModels = { ...get().guestModels, selectedModelId }
      set({ guestModels })
      storeGuestPreferences(guestModels)
    },
    toggleGuestFavorite(modelId) {
      if (!isChatModelId(modelId)) return
      const current = get().guestModels
      const favoriteModelIds = current.favoriteModelIds.includes(modelId)
        ? current.favoriteModelIds.filter((item) => item !== modelId)
        : [...current.favoriteModelIds, modelId].slice(0, MAX_FAVORITE_MODELS)
      const guestModels = { ...current, favoriteModelIds }
      set({ guestModels })
      storeGuestPreferences(guestModels)
    },
    setGuestCombineResults(combineResults) {
      const guestModels = { ...get().guestModels, combineResults }
      set({ guestModels })
      storeGuestPreferences(guestModels)
    },
  })
  if (import.meta.env.DEV) {
    return createStore<PreferencesState>()(
      devtools(initializer, { name: "Preferences" })
    )
  }
  return createStore<PreferencesState>()(initializer)
}

export type PreferencesStore = ReturnType<typeof createPreferencesStore>
