import { describe, expect, test } from "vitest"

import { createModelPickerStore } from "@/stores/model-picker-store"

describe("model picker store", () => {
  test("updates filters immutably and clears filter state", () => {
    const store = createModelPickerStore()
    const initialCapabilities = store.getState().capabilities

    store.getState().setSearch("reasoning")
    store.getState().toggleCapability("reasoning")

    expect(store.getState().capabilities).not.toBe(initialCapabilities)
    expect(store.getState()).toMatchObject({
      search: "reasoning",
      capabilities: ["reasoning"],
    })

    store.getState().clearFilters()
    expect(store.getState()).toMatchObject({ search: "", capabilities: [] })
  })
})
