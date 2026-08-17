import { hasWindow } from "@/lib/runtime-env"

export const SIGN_IN_PATH = "/sign-in"
export const SSO_CALLBACK_PATH = "/sso-callback"
export const DEFAULT_AUTH_REDIRECT = "/"
export const AUTH_REDIRECT_STORAGE_KEY = "t3chat.auth.redirect"

export function getSafeAuthRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT
  }

  const redirectUrl = new URL(value, "http://t3-chat.local")
  if (
    redirectUrl.pathname === SIGN_IN_PATH ||
    redirectUrl.pathname === SSO_CALLBACK_PATH
  ) {
    return DEFAULT_AUTH_REDIRECT
  }

  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
}

export function rememberAuthRedirect(redirectUrl: string) {
  if (!hasWindow()) return
  window.sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, redirectUrl)
}

export function consumeAuthRedirect() {
  if (!hasWindow()) return DEFAULT_AUTH_REDIRECT

  const stored = window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)
  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
  return getSafeAuthRedirect(stored ?? undefined)
}
