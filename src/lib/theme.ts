export type ColorSchemePreference = "light" | "system" | "dark"

export const COLOR_SCHEME_STORAGE_KEY = "t3chat-theme"

export function isColorSchemePreference(
  value: string | null,
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

export function resolveIsDark(preference: ColorSchemePreference) {
  return (
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  )
}

export function applyTheme(preference: ColorSchemePreference) {
  document.documentElement.classList.toggle("dark", resolveIsDark(preference))
}

export function storeColorSchemePreference(preference: ColorSchemePreference) {
  try {
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, preference)
  } catch {
    // Preference still applies for the current page when storage is blocked.
  }
}

export const themeBootScript = `(function(){try{var k="t3chat-theme",t=localStorage.getItem(k),d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`
