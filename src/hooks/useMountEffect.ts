import { useEffect, useRef } from "react"

/**
 * Runs `fn` exactly once on mount.
 * If `fn` returns a cleanup function, it runs on unmount.
 */
export function useMountEffect(fn: () => void | (() => void)) {
  useEffect(() => {
    return fn?.()
    // Mount-only by design — see frontend use-effect skill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * Notifies an external consumer after `value` commits.
 * Use this instead of calling another component's setState during render.
 */
export function useValueEffect<T>(value: T, onChange: (value: T) => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    onChangeRef.current(value)
  }, [value])
}
