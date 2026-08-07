import { createContext, useContext, useRef } from "react"
import type { ReactNode } from "react"
import { useStore } from "zustand"

import { useMountEffect } from "@/hooks/useMountEffect"
import { createChatUiStore } from "@/stores/chat-ui-store"
import type { ChatUiState, ChatUiStore } from "@/stores/chat-ui-store"
import { createModelPickerStore } from "@/stores/model-picker-store"
import type {
  ModelPickerState,
  ModelPickerStore,
} from "@/stores/model-picker-store"
import { createPreferencesStore } from "@/stores/preferences-store"
import type {
  PreferencesState,
  PreferencesStore,
} from "@/stores/preferences-store"
import { readSidebarDesktopOpen } from "@/stores/sidebar-state-cookie"
import { createSidebarUiStore } from "@/stores/sidebar-ui-store"
import type { SidebarUiState, SidebarUiStore } from "@/stores/sidebar-ui-store"

type AppStores = {
  chatUi: ChatUiStore
  modelPicker: ModelPickerStore
  preferences: PreferencesStore
  sidebarUi: SidebarUiStore
}

const AppStoresContext = createContext<AppStores | null>(null)

function createAppStores(): AppStores {
  return {
    chatUi: createChatUiStore(),
    modelPicker: createModelPickerStore(),
    preferences: createPreferencesStore(),
    sidebarUi: createSidebarUiStore(readSidebarDesktopOpen()),
  }
}

function useAppStores(): AppStores {
  const stores = useContext(AppStoresContext)
  if (!stores) {
    throw new Error("Application state must be used inside AppStateProvider")
  }
  return stores
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const storesRef = useRef<AppStores | null>(null)
  if (!storesRef.current) storesRef.current = createAppStores()
  const stores = storesRef.current

  useMountEffect(() => {
    void Promise.resolve(stores.chatUi.persist.rehydrate()).finally(() => {
      stores.chatUi.getState().markHydrated()
    })

    const preferences = stores.preferences.getState()
    preferences.hydrateClientPreferences()
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemThemeChange = () =>
      stores.preferences.getState().syncSystemTheme()
    systemTheme.addEventListener("change", handleSystemThemeChange)

    return () => {
      systemTheme.removeEventListener("change", handleSystemThemeChange)
    }
  })

  return (
    <AppStoresContext.Provider value={stores}>
      {children}
    </AppStoresContext.Provider>
  )
}

export function useChatUiStore<T>(selector: (state: ChatUiState) => T): T {
  return useStore(useAppStores().chatUi, selector)
}

export function useModelPickerStore<T>(
  selector: (state: ModelPickerState) => T
): T {
  return useStore(useAppStores().modelPicker, selector)
}

export function usePreferencesStore<T>(
  selector: (state: PreferencesState) => T
): T {
  return useStore(useAppStores().preferences, selector)
}

export function useSidebarUiStore<T>(
  selector: (state: SidebarUiState) => T
): T {
  return useStore(useAppStores().sidebarUi, selector)
}
