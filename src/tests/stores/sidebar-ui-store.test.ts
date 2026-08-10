// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vitest"

import {
  SIDEBAR_STATE_COOKIE_NAME,
  parseSidebarDesktopOpen,
} from "@/stores/sidebar-ui-constants"
import { createSidebarUiStore } from "@/stores/sidebar-ui-store"

function readSidebarCookie() {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${SIDEBAR_STATE_COOKIE_NAME}=`))
    ?.slice(SIDEBAR_STATE_COOKIE_NAME.length + 1)
}

beforeEach(() => {
  document.cookie = `${SIDEBAR_STATE_COOKIE_NAME}=; path=/; max-age=0`
})

describe("sidebar UI store", () => {
  test("starts from the open state the caller resolved from the cookie", () => {
    expect(createSidebarUiStore(false).getState()).toMatchObject({
      desktopOpen: false,
      mobileOpen: false,
      searchQuery: "",
      pinnedExpanded: true,
    })
    expect(createSidebarUiStore().getState().desktopOpen).toBe(true)
  })

  test("writes the desktop open state to the cookie on every change", () => {
    const store = createSidebarUiStore()

    store.getState().setDesktopOpen(false)
    expect(parseSidebarDesktopOpen(readSidebarCookie())).toBe(false)

    store.getState().toggleDesktop()
    expect(store.getState().desktopOpen).toBe(true)
    expect(parseSidebarDesktopOpen(readSidebarCookie())).toBe(true)
  })

  test("keeps transient sidebar state out of the cookie", () => {
    const store = createSidebarUiStore()
    store.getState().setMobileOpen(true)
    store.getState().setSearchQuery("not persisted")
    store.getState().setPinnedExpanded(false)

    expect(readSidebarCookie()).toBeUndefined()
  })
})
