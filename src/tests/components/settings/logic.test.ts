import { describe, expect, it } from "vitest"

import {
  getActiveSettingsTabId,
  getPlanAction,
  isSettingsPlaceholderSection,
  canAddTrait,
  traitCharacterCount,
} from "@/components/settings/logic"

describe("getPlanAction", () => {
  it("marks the active plan as current", () => {
    expect(getPlanAction("pro", "pro")).toBe("current")
  })

  it("downgrades toward a cheaper plan", () => {
    expect(getPlanAction("free", "pro")).toBe("downgrade")
  })

  it("upgrades toward a higher plan", () => {
    expect(getPlanAction("premier", "pro")).toBe("upgrade")
  })
})

describe("isSettingsPlaceholderSection", () => {
  it("accepts known placeholder sections", () => {
    expect(isSettingsPlaceholderSection("history")).toBe(true)
  })

  it("rejects implemented tabs and unknown paths", () => {
    expect(isSettingsPlaceholderSection("account")).toBe(false)
    expect(isSettingsPlaceholderSection("customization")).toBe(false)
    expect(isSettingsPlaceholderSection("billing")).toBe(false)
  })
})

describe("getActiveSettingsTabId", () => {
  it("uses account on the settings index", () => {
    expect(getActiveSettingsTabId("/settings")).toBe("account")
  })

  it("reads a known section from the path", () => {
    expect(getActiveSettingsTabId("/settings/customization")).toBe(
      "customization"
    )
  })

  it("falls back to account for unknown sections", () => {
    expect(getActiveSettingsTabId("/settings/billing")).toBe("account")
  })
})

describe("traitCharacterCount", () => {
  it("counts a draft alone", () => {
    expect(traitCharacterCount([], "friendly")).toBe(8)
  })

  it("joins existing traits with a comma and space", () => {
    expect(traitCharacterCount(["witty"], "concise")).toBe(14)
  })
})

describe("canAddTrait", () => {
  it("rejects blank, duplicate, and over-budget traits", () => {
    expect(canAddTrait(["witty"], "  ", 100)).toBe(false)
    expect(canAddTrait(["witty"], "Witty", 100)).toBe(false)
    expect(canAddTrait(["witty"], "a".repeat(96), 100)).toBe(false)
  })

  it("accepts a new trait that fits", () => {
    expect(canAddTrait(["witty"], "concise", 100)).toBe(true)
  })
})
