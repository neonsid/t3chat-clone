// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { useCoalescedValue } from "@/hooks/useCoalescedValue"

const INTERVAL_MS = 60

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test("passes the value straight through while disabled", () => {
  const { result, rerender } = renderHook(
    ({ value }) => useCoalescedValue(value, INTERVAL_MS, false),
    { initialProps: { value: "first" } }
  )

  rerender({ value: "second" })

  expect(result.current).toBe("second")
})

test("shows the live value on the render that opens a window", () => {
  const { result, rerender } = renderHook(
    ({ value, enabled }) => useCoalescedValue(value, INTERVAL_MS, enabled),
    { initialProps: { value: "idle", enabled: false } }
  )

  rerender({ value: "first chunk", enabled: true })

  expect(result.current).toBe("first chunk")
})

test("withholds an update that lands inside the window", () => {
  const { result, rerender } = renderHook(
    ({ value }) => useCoalescedValue(value, INTERVAL_MS, true),
    { initialProps: { value: "first" } }
  )

  advance(INTERVAL_MS)
  rerender({ value: "second" })

  expect(result.current).toBe("first")
})

test("releases the trailing update with no further input", () => {
  const { result, rerender } = renderHook(
    ({ value }) => useCoalescedValue(value, INTERVAL_MS, true),
    { initialProps: { value: "first" } }
  )

  advance(INTERVAL_MS)
  rerender({ value: "last chunk of the burst" })
  advance(INTERVAL_MS)

  expect(result.current).toBe("last chunk of the burst")
})

test("reveals a withheld update when the window closes", () => {
  const { result, rerender } = renderHook(
    ({ value, enabled }) => useCoalescedValue(value, INTERVAL_MS, enabled),
    { initialProps: { value: "first", enabled: true } }
  )

  advance(INTERVAL_MS)
  rerender({ value: "final", enabled: true })
  rerender({ value: "final", enabled: false })

  expect(result.current).toBe("final")
})

test("collapses a burst into one update per interval", () => {
  let renders = 0
  const { result, rerender } = renderHook(
    ({ value }) => {
      renders += 1
      return useCoalescedValue(value, INTERVAL_MS, true)
    },
    { initialProps: { value: 0 } }
  )

  advance(INTERVAL_MS)
  const rendersAfterFirstRelease = renders

  for (let chunk = 1; chunk <= 10; chunk++) {
    rerender({ value: chunk })
  }

  // Ten chunks inside one window cost ten parent renders and no release.
  expect(renders - rendersAfterFirstRelease).toBe(10)
  expect(result.current).toBe(0)

  advance(INTERVAL_MS)
  expect(result.current).toBe(10)
})
