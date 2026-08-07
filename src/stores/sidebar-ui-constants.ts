export const SIDEBAR_STATE_COOKIE_NAME = "t3chat-sidebar"
export const SIDEBAR_OPEN_COOKIE_VALUE = "open"
export const SIDEBAR_CLOSED_COOKIE_VALUE = "closed"
export const SIDEBAR_STATE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export const DEFAULT_SIDEBAR_STATE = Object.freeze({
  desktopOpen: true,
  mobileOpen: false,
  searchQuery: "",
  pinnedExpanded: true,
})

export function parseSidebarDesktopOpen(value: string | null | undefined) {
  if (value === SIDEBAR_OPEN_COOKIE_VALUE) return true
  if (value === SIDEBAR_CLOSED_COOKIE_VALUE) return false
  return DEFAULT_SIDEBAR_STATE.desktopOpen
}

export function serializeSidebarDesktopOpen(desktopOpen: boolean) {
  return desktopOpen ? SIDEBAR_OPEN_COOKIE_VALUE : SIDEBAR_CLOSED_COOKIE_VALUE
}
