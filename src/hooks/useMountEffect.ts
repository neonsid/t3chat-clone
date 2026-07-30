import { useEffect, useEffectEvent } from "react"

/**
 * Runs `fn` exactly once on mount.
 * If `fn` returns a cleanup function, it runs on unmount.
 */
export function useMountEffect(fn: () => void | (() => void)) {
  const onMount = useEffectEvent(fn)

  useEffect(() => {
    return onMount()
  }, [])
}

/**
 * Notifies an external consumer after `value` commits.
 * Use this instead of calling another component's setState during render.
 */
export function useValueEffect<T>(value: T, onChange: (value: T) => void) {
  const notifyChange = useEffectEvent(onChange)

  useEffect(() => {
    notifyChange(value)
  }, [value])
}
