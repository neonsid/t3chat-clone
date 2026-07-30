import { useSyncExternalStore } from "react"
import {
  getModelStoreServerState,
  getModelStoreState,
  subscribeToModelStore,
} from "@/lib/model-store"
import type { ModelStoreState } from "@/lib/model-store"

/**
 * Binds the shared catalog store to React. Returns the raw state so callers can
 * derive lists with `useMemo`; deriving inside the snapshot getter would hand
 * `useSyncExternalStore` a fresh array on every read and loop forever.
 */
export function useModelStore(): ModelStoreState {
  return useSyncExternalStore(
    subscribeToModelStore,
    getModelStoreState,
    getModelStoreServerState
  )
}
