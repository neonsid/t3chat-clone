import { describe, expect, test } from "vitest"

import {
  parseSidebarDesktopOpen,
  serializeSidebarDesktopOpen,
} from "@/stores/sidebar-ui-constants"

describe("sidebar state cookie value", () => {
  test("round-trips both open states", () => {
    expect(parseSidebarDesktopOpen(serializeSidebarDesktopOpen(true))).toBe(
      true
    )
    expect(parseSidebarDesktopOpen(serializeSidebarDesktopOpen(false))).toBe(
      false
    )
  })

  test("falls back to open for missing or malformed values", () => {
    expect(parseSidebarDesktopOpen(undefined)).toBe(true)
    expect(parseSidebarDesktopOpen(null)).toBe(true)
    expect(parseSidebarDesktopOpen("")).toBe(true)
    expect(parseSidebarDesktopOpen("nope")).toBe(true)
  })
})
