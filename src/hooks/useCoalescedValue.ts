import { useEffect, useRef, useState } from "react"

/**
 * Releases `value` to the render tree at most once per `intervalMs` while
 * `enabled`, and passes it straight through otherwise.
 *
 * Streaming chunks arrive far faster than anyone reads, and each one costs a
 * full markdown re-parse whose price grows with the answer length. Rate
 * limiting the handoff bounds that cost without visible lag.
 *
 * The pending release is a timer, which is the one thing a mount-only effect
 * cannot express: the wait has to be rescheduled as the value changes. Nothing
 * else can close the window, either — a withheld chunk would otherwise wait for
 * the next chunk, and the chunk that ends a burst has none. That is not just
 * the end of an answer: the stream stays open for a Convex round trip after the
 * last token, and a model pausing between reasoning and answer is the same
 * shape.
 */
export function useCoalescedValue<T>(
  value: T,
  intervalMs: number,
  enabled: boolean
): T {
  const [released, setReleased] = useState(value)
  const [coalescing, setCoalescing] = useState(enabled)
  const releasedAtRef = useRef(0)

  // Entering or leaving a window shows the live value at once. Adjusting state
  // during render keeps that in the same pass, so the first chunk of a turn is
  // never a frame behind whatever was on screen before it.
  if (coalescing !== enabled) {
    setCoalescing(enabled)
    setReleased(value)
  }

  useEffect(() => {
    if (!enabled) return

    const wait = Math.max(
      0,
      intervalMs - (performance.now() - releasedAtRef.current)
    )
    const timeout = window.setTimeout(() => {
      releasedAtRef.current = performance.now()
      setReleased(value)
    }, wait)

    return () => window.clearTimeout(timeout)
  }, [enabled, intervalMs, value])

  return enabled ? released : value
}
