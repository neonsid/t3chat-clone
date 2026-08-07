import type { ModelCapability, ModelProviderId } from "@t3chat/model-catalog"
import { createStore } from "zustand/vanilla"
import type { StateCreator } from "zustand/vanilla"
import { devtools } from "zustand/middleware"

export type ModelRailTab = "favorites" | ModelProviderId

export type ModelPickerState = {
  search: string
  capabilities: ReadonlyArray<ModelCapability>
  railTab: ModelRailTab
  setSearch: (search: string) => void
  setRailTab: (railTab: ModelRailTab) => void
  toggleCapability: (capability: ModelCapability) => void
  clearFilters: () => void
}

export function createModelPickerStore() {
  const initializer: StateCreator<ModelPickerState> = (set) => ({
    search: "",
    capabilities: [],
    railTab: "favorites",
    setSearch(search) {
      set({ search })
    },
    setRailTab(railTab) {
      set({ railTab })
    },
    toggleCapability(capability) {
      set((state) => ({
        capabilities: state.capabilities.includes(capability)
          ? state.capabilities.filter((item) => item !== capability)
          : [...state.capabilities, capability],
      }))
    },
    clearFilters() {
      set({ search: "", capabilities: [] })
    },
  })
  if (import.meta.env.DEV) {
    return createStore<ModelPickerState>()(
      devtools(initializer, { name: "Model Picker" })
    )
  }
  return createStore<ModelPickerState>()(initializer)
}

export type ModelPickerStore = ReturnType<typeof createModelPickerStore>
