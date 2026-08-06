import { useEffect, useEffectEvent, useRef } from "react"

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
 * Subscribes once while letting the external source call the latest listener.
 * The Effect Event stays inside the same hook and effect that own the
 * subscription, which keeps React's event semantics intact.
 */
export function useMountSubscription<TArguments extends unknown[]>(
  listener: (...args: TArguments) => void,
  subscribe: (listener: (...args: TArguments) => void) => void | (() => void)
) {
  const onEvent = useEffectEvent(listener)
  const subscribeOnMount = useRef(subscribe)

  useEffect(() => {
    const handleEvent = (...args: TArguments) => onEvent(...args)
    return subscribeOnMount.current(handleEvent)
  }, [])
}
