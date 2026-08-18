import { describe, expect, it } from "vitest"

import {
  getActiveSettingsTabId,
  getPlanAction,
  isSettingsPlaceholderSection,
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
  it("accepts known settings sections", () => {
    expect(isSettingsPlaceholderSection("customization")).toBe(true)
  })

  it("rejects the account index and unknown paths", () => {
    expect(isSettingsPlaceholderSection("account")).toBe(false)
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
