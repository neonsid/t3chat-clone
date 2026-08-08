export type ColorSchemePreference = "light" | "system" | "dark"

export const DEFAULT_COLOR_THEME_ID = "default"
export const T3_CHAT_COLOR_THEME_ID = "t3-chat"

export type ColorThemePreference =
  typeof DEFAULT_COLOR_THEME_ID | typeof T3_CHAT_COLOR_THEME_ID

export const COLOR_SCHEME_STORAGE_KEY = "t3chat-theme"
export const COLOR_THEME_STORAGE_KEY = "t3chat-color-theme"

export function isColorSchemePreference(
  value: string | null
): value is ColorSchemePreference {
  return value === "light" || value === "system" || value === "dark"
}

export function readColorSchemePreference(): ColorSchemePreference {
  try {
    const stored = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
    return isColorSchemePreference(stored) ? stored : "system"
  } catch {
    return "system"
  }
}

export function isColorThemePreference(
  value: string | null
): value is ColorThemePreference {
  return value === DEFAULT_COLOR_THEME_ID || value === T3_CHAT_COLOR_THEME_ID
}

export function readColorThemePreference(): ColorThemePreference {
  try {
    const stored = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY)
    return isColorThemePreference(stored) ? stored : DEFAULT_COLOR_THEME_ID
  } catch {
    return DEFAULT_COLOR_THEME_ID
  }
}

export function resolveIsDark(preference: ColorSchemePreference) {
  return (
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  )
}

export function applyTheme(
  preference: ColorSchemePreference,
  colorTheme: ColorThemePreference = DEFAULT_COLOR_THEME_ID
) {
  document.documentElement.classList.toggle("dark", resolveIsDark(preference))
  if (colorTheme === T3_CHAT_COLOR_THEME_ID) {
    document.documentElement.dataset.themeId = colorTheme
  } else {
    delete document.documentElement.dataset.themeId
  }
}

export function storeColorSchemePreference(preference: ColorSchemePreference) {
  try {
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, preference)
  } catch {
    // Preference still applies for the current page when storage is blocked.
  }
}

export function storeColorThemePreference(preference: ColorThemePreference) {
  try {
    window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, preference)
  } catch {
    // Preference still applies for the current page when storage is blocked.
  }
}

export const themeBootScript = `(function(){try{var k="t3chat-theme",p="t3chat-color-theme",t=localStorage.getItem(k),c=localStorage.getItem(p),d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches),r=document.documentElement;r.classList.toggle("dark",d);if(c==="t3-chat")r.dataset.themeId=c;else delete r.dataset.themeId}catch(e){}})();`
