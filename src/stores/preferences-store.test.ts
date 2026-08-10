import { beforeEach, describe, expect, test, vi } from "vitest"

import { createPreferencesStore } from "@/stores/preferences-store"
import { createMemoryStorage } from "@/stores/test-utils"

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage())
  vi.stubGlobal("window", {
    localStorage,
    matchMedia: () => ({ matches: false }),
  })
  vi.stubGlobal("document", {
    documentElement: {
      classList: { toggle: vi.fn() },
      dataset: {},
    },
  })
})

describe("preferences store", () => {
  test("persists valid guest model preferences", () => {
    const firstStore = createPreferencesStore()
    firstStore.getState().selectGuestModel("openai/gpt-5.4-mini")
    firstStore.getState().setGuestCombineResults(false)

    const secondStore = createPreferencesStore()
    secondStore.getState().hydrateClientPreferences()

    expect(secondStore.getState().guestModels).toMatchObject({
      selectedModelId: "openai/gpt-5.4-mini",
      combineResults: false,
    })
  })

  test("rejects an unknown guest model", () => {
    const store = createPreferencesStore()
    const initial = store.getState().guestModels

    store.getState().selectGuestModel("unknown/model")

    expect(store.getState().guestModels).toBe(initial)
  })

  test("persists the selected color theme", () => {
    const firstStore = createPreferencesStore()
    firstStore.getState().setColorTheme("t3-chat")

    const secondStore = createPreferencesStore()
    secondStore.getState().hydrateClientPreferences()

    expect(secondStore.getState().colorTheme).toBe("t3-chat")
    expect(document.documentElement.dataset.themeId).toBe("t3-chat")
  })
})
