import { describe, expect, it } from "vitest"

import {
  getActiveSettingsTabId,
  getPlanAction,
  isSettingsPlaceholderSection,
  canAddTrait,
  traitCharacterCount,
  getCopyFromOptions,
  getHistoryPage,
  pageSelection,
  setPageSelected,
  toggleIdInList,
  removeIds,
  historyActionLabel,
} from "@/components/settings/logic"
import {
  COPY_FROM_SCRATCH_ID,
  CUSTOMIZATION_CREATE_PROFILE,
} from "@/components/settings/constants"

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
    expect(isSettingsPlaceholderSection("models")).toBe(true)
  })

  it("rejects implemented tabs and unknown paths", () => {
    expect(isSettingsPlaceholderSection("account")).toBe(false)
    expect(isSettingsPlaceholderSection("customization")).toBe(false)
    expect(isSettingsPlaceholderSection("history")).toBe(false)
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
    expect(getActiveSettingsTabId("/settings/history")).toBe("history")
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

describe("getCopyFromOptions", () => {
  it("starts with scratch and then lists profiles", () => {
    expect(
      getCopyFromOptions([
        { id: "default", name: "Default" },
        { id: "work", name: "Work" },
      ])
    ).toEqual([
      {
        id: COPY_FROM_SCRATCH_ID,
        label: CUSTOMIZATION_CREATE_PROFILE.copyFromScratch,
      },
      { id: "default", label: "Default" },
      { id: "work", label: "Work" },
    ])
  })
})

describe("getHistoryPage", () => {
  const items = ["a", "b", "c", "d", "e"]

  it("slices the requested page", () => {
    expect(getHistoryPage(items, 1, 2)).toEqual({
      page: 1,
      pageCount: 3,
      items: ["c", "d"],
      canPrev: true,
      canNext: true,
    })
  })

  it("clamps an out-of-range page", () => {
    expect(getHistoryPage(items, 9, 2).page).toBe(2)
    expect(getHistoryPage(items, -1, 2).page).toBe(0)
  })
})

describe("history selection", () => {
  it("toggles an id in the list", () => {
    expect(toggleIdInList(["a"], "b")).toEqual(["a", "b"])
    expect(toggleIdInList(["a", "b"], "a")).toEqual(["b"])
  })

  it("reports none, some, and all for the current page", () => {
    expect(pageSelection(["a", "b"], [])).toBe("none")
    expect(pageSelection(["a", "b"], ["a"])).toBe("some")
    expect(pageSelection(["a", "b"], ["a", "b", "c"])).toBe("all")
  })

  it("selects or clears only the current page", () => {
    expect(setPageSelected(["a", "b"], ["c"], true)).toEqual(["c", "a", "b"])
    expect(setPageSelected(["a", "b"], ["a", "c"], false)).toEqual(["c"])
  })

  it("removes selected rows and formats action labels", () => {
    expect(
      removeIds(
        [
          { id: "a", title: "A" },
          { id: "b", title: "B" },
        ],
        ["a"]
      )
    ).toEqual([{ id: "b", title: "B" }])
    expect(historyActionLabel("Delete", 1)).toBe("Delete (1)")
  })
})
