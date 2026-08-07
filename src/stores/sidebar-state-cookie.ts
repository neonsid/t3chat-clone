import { createIsomorphicFn } from "@tanstack/react-start"
import { getCookie } from "@tanstack/react-start/server"

import {
  DEFAULT_SIDEBAR_STATE,
  SIDEBAR_STATE_COOKIE_MAX_AGE_SECONDS,
  SIDEBAR_STATE_COOKIE_NAME,
  parseSidebarDesktopOpen,
  serializeSidebarDesktopOpen,
} from "@/stores/sidebar-ui-constants"

function readDocumentCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

/**
 * The sidebar lives in a cookie rather than local storage so the server render
 * already emits the collapsed layout. Anything the server cannot see has to be
 * corrected after hydration, which is exactly the flicker we are avoiding.
 */
export const readSidebarDesktopOpen = createIsomorphicFn()
  .server(() => {
    try {
      return parseSidebarDesktopOpen(getCookie(SIDEBAR_STATE_COOKIE_NAME))
    } catch {
      return DEFAULT_SIDEBAR_STATE.desktopOpen
    }
  })
  .client(() =>
    parseSidebarDesktopOpen(readDocumentCookie(SIDEBAR_STATE_COOKIE_NAME))
  )

export function persistSidebarDesktopOpen(desktopOpen: boolean) {
  if (typeof document === "undefined") return
  const value = serializeSidebarDesktopOpen(desktopOpen)
  document.cookie = `${SIDEBAR_STATE_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_STATE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`
}
