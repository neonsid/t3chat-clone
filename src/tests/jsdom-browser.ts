import { vi } from "vitest"

import { createMemoryStorage } from "@/stores/test-utils"

export function installJsdomMatchMedia() {
  // SAFETY: jsdom has no matchMedia. Tests only read matches and the listener API.
  window.matchMedia = ((query: string) => ({
    matches: query.includes("hover"),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  })) as typeof window.matchMedia
}

export function installJsdomLocalStorage() {
  vi.stubGlobal("localStorage", createMemoryStorage())
}
