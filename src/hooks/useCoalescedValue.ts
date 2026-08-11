import { useRef } from "react"

/**
 * Lets `value` through at most once per `intervalMs` while `enabled`, and
 * passes it straight through otherwise.
 *
 * Streaming chunks arrive far faster than anyone reads, and each one costs a
 * full markdown re-parse whose price grows with the answer length. Rate
 * limiting the handoff bounds that cost without visible lag.
 *
 * No timer, so nothing schedules a render on its own: the chunk that arrives
 * after the window has closed carries the update, and dropping out of
 * `enabled` (the stream ending) always reveals the latest value. A held-back
 * value is therefore only ever visible while more chunks are still coming.
 */
export function useCoalescedValue<T>(
  value: T,
  intervalMs: number,
  enabled: boolean
): T {
  const releasedRef = useRef(value)
  const releasedAtRef = useRef(0)

  if (!enabled) {
    releasedRef.current = value
    releasedAtRef.current = 0
    return value
  }

  const now = performance.now()
  if (now - releasedAtRef.current >= intervalMs) {
    releasedRef.current = value
    releasedAtRef.current = now
  }

  return releasedRef.current
}
