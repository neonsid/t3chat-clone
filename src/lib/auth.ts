export const SIGN_IN_PATH = "/sign-in"
export const DEFAULT_AUTH_REDIRECT = "/"

export function getSafeAuthRedirect(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return DEFAULT_AUTH_REDIRECT
  }

  const redirectUrl = new URL(value, "http://t3-chat.local")
  if (redirectUrl.pathname === SIGN_IN_PATH) return DEFAULT_AUTH_REDIRECT

  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
}
