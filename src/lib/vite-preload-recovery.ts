const RELOAD_GUARD_KEY = "vite-preload-recovery"

let installed = false

function isChunkLoadFailure(error: unknown) {
  if (!(error instanceof Error)) return false
  return (
    error.message.includes("Failed to fetch dynamically imported module") ||
    error.message.includes("Importing a module script failed") ||
    error.message.includes("error loading dynamically imported module")
  )
}

function reloadOnce() {
  if (typeof window === "undefined") return
  if (sessionStorage.getItem(RELOAD_GUARD_KEY) === "1") return
  sessionStorage.setItem(RELOAD_GUARD_KEY, "1")
  window.location.reload()
}

/** Recover from stale Vite/dep-optimized chunks (common after HMR or redeploy). */
export function installVitePreloadRecovery() {
  if (typeof window === "undefined" || installed) return
  installed = true

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault()
    reloadOnce()
  })

  window.addEventListener("unhandledrejection", (event) => {
    if (!isChunkLoadFailure(event.reason)) return
    event.preventDefault()
    reloadOnce()
  })

  // Allow a future recovery after this boot succeeds.
  window.setTimeout(() => {
    sessionStorage.removeItem(RELOAD_GUARD_KEY)
  }, 10_000)
}
