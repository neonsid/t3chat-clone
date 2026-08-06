import { useMountSubscription } from "@/hooks/useMountEffect"

export function useWindowEvent<TEventName extends keyof WindowEventMap>(
  type: TEventName,
  listener: (event: WindowEventMap[TEventName]) => void,
  options?: boolean | AddEventListenerOptions
) {
  useMountSubscription(listener, (handleEvent) => {
    window.addEventListener(type, handleEvent, options)
    return () => window.removeEventListener(type, handleEvent, options)
  })
}
