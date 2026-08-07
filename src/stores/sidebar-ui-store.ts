import { createStore } from "zustand/vanilla"
import type { StateCreator } from "zustand/vanilla"
import { devtools } from "zustand/middleware"

import { persistSidebarDesktopOpen } from "@/stores/sidebar-state-cookie"
import { DEFAULT_SIDEBAR_STATE } from "@/stores/sidebar-ui-constants"

export type SidebarUiState = {
  desktopOpen: boolean
  mobileOpen: boolean
  searchQuery: string
  pinnedExpanded: boolean
  setDesktopOpen: (open: boolean) => void
  setMobileOpen: (open: boolean) => void
  toggleDesktop: () => void
  toggleMobile: () => void
  setSearchQuery: (searchQuery: string) => void
  setPinnedExpanded: (pinnedExpanded: boolean) => void
  clearSearch: () => void
}

export function createSidebarUiStore(
  desktopOpen: boolean = DEFAULT_SIDEBAR_STATE.desktopOpen
) {
  const initializer: StateCreator<SidebarUiState> = (set, get) => ({
    ...DEFAULT_SIDEBAR_STATE,
    desktopOpen,
    setDesktopOpen(nextDesktopOpen) {
      persistSidebarDesktopOpen(nextDesktopOpen)
      set({ desktopOpen: nextDesktopOpen })
    },
    setMobileOpen(mobileOpen) {
      set({ mobileOpen })
    },
    toggleDesktop() {
      get().setDesktopOpen(!get().desktopOpen)
    },
    toggleMobile() {
      get().setMobileOpen(!get().mobileOpen)
    },
    setSearchQuery(searchQuery) {
      set({ searchQuery })
    },
    setPinnedExpanded(pinnedExpanded) {
      set({ pinnedExpanded })
    },
    clearSearch() {
      set({ searchQuery: "" })
    },
  })

  if (import.meta.env.DEV) {
    return createStore<SidebarUiState>()(
      devtools(initializer, { name: "Sidebar UI" })
    )
  }
  return createStore<SidebarUiState>()(initializer)
}

export type SidebarUiStore = ReturnType<typeof createSidebarUiStore>
