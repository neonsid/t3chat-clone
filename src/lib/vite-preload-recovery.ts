import { hasWindow } from "@/lib/runtime-env"

const RELOAD_GUARD_KEY = "vite-preload-recovery"

let installed = false

function isChunkLoadFailure(error: Error) {
  return (
    error.message.includes("Failed to fetch dynamically imported module") ||
    error.message.includes("Importing a module script failed") ||
    error.message.includes("error loading dynamically imported module")
  )
}

function reloadOnce() {
  if (!hasWindow()) return
  if (sessionStorage.getItem(RELOAD_GUARD_KEY) === "1") return
  sessionStorage.setItem(RELOAD_GUARD_KEY, "1")
  window.location.reload()
}

/** Recover from stale Vite/dep-optimized chunks (common after HMR or redeploy). */
export function installVitePreloadRecovery() {
  if (!hasWindow() || installed) return
  installed = true

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault()
    reloadOnce()
  })

  window.addEventListener("unhandledrejection", (event) => {
    if (!(event.reason instanceof Error) || !isChunkLoadFailure(event.reason)) {
      return
    }
    event.preventDefault()
    reloadOnce()
  })

  // Allow a future recovery after this boot succeeds.
  window.setTimeout(() => {
    sessionStorage.removeItem(RELOAD_GUARD_KEY)
  }, 10_000)
}
