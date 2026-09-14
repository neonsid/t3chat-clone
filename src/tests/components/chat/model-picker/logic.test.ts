import { describe, expect, it } from "vitest"

import { MODEL_PICKER_RAIL_PROVIDERS } from "@/components/chat/model-picker/constants"
import {
  modelsForRailTab,
  railTabForModelId,
} from "@/components/chat/model-picker/logic"
import { CHAT_MODEL_CATALOG } from "@/lib/chat-models"

describe("branch model rail", () => {
  it("includes every executable catalog provider", () => {
    const railIds = MODEL_PICKER_RAIL_PROVIDERS.map((provider) => provider.id)
    const catalogProviders = [
      ...new Set(CHAT_MODEL_CATALOG.map((model) => model.providerId)),
    ]

    expect([...railIds].sort()).toEqual([...catalogProviders].sort())
  })

  it("lists models for every provider on the rail", () => {
    const emptyFavorites = new Set<string>()

    for (const provider of MODEL_PICKER_RAIL_PROVIDERS) {
      expect(
        modelsForRailTab(provider.id, emptyFavorites).length
      ).toBeGreaterThan(0)
    }
  })

  it("lists executable OpenAI models on the OpenAI rail", () => {
    const ids = modelsForRailTab("openai", new Set()).map((model) => model.id)
    expect(ids).toContain("openai/gpt-6-astra")
    expect(ids).toContain("openai/gpt-5.6-sol")
    expect(ids).toContain("openai/gpt-5.5")
    expect(ids).toContain("openai/gpt-5.4-mini")
  })

  it("opens on the selected model's provider", () => {
    expect(railTabForModelId("anthropic/claude-sonnet-5")).toBe("anthropic")
    expect(railTabForModelId("google/gemini-3.1-flash-lite")).toBe("google")
    expect(railTabForModelId("openai/gpt-5.5")).toBe("openai")
    expect(railTabForModelId("not-a-model")).toBe("favorites")
  })

  it("keeps favorites scoped to starred models", () => {
    const favoriteId = CHAT_MODEL_CATALOG[0]?.id
    expect(favoriteId).toBeDefined()
    if (!favoriteId) return

    const models = modelsForRailTab("favorites", new Set([favoriteId]))
    expect(models.map((model) => model.id)).toEqual([favoriteId])
  })
})
