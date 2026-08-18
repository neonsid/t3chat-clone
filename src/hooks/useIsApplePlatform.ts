import { useCallback, useSyncExternalStore } from "react"

const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/i
const getServerSnapshot = () => false

export function useIsApplePlatform() {
  const subscribe = useCallback(() => () => {}, [])
  const getSnapshot = useCallback(
    () => APPLE_PLATFORM_PATTERN.test(navigator.userAgent),
    []
  )

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
