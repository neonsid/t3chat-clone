// @vitest-environment jsdom

import { cleanup, act, renderHook } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"

import { useStreamingDisclosure } from "@/components/chat/thread/useStreamingDisclosure"

afterEach(() => {
  cleanup()
})

test("follow tracks the stream until the user toggles it", () => {
  const { result, rerender } = renderHook(
    ({ isActive }) => useStreamingDisclosure(isActive, "follow"),
    { initialProps: { isActive: true } }
  )

  expect(result.current.expanded).toBe(true)

  rerender({ isActive: false })
  expect(result.current.expanded).toBe(false)

  act(() => {
    result.current.toggle()
  })
  expect(result.current.expanded).toBe(true)

  rerender({ isActive: true })
  expect(result.current.expanded).toBe(true)
  rerender({ isActive: false })
  expect(result.current.expanded).toBe(true)
})

test("expand-only opens with the stream and keeps a manual collapse", () => {
  const { result, rerender } = renderHook(
    ({ isActive }) => useStreamingDisclosure(isActive, "expand-only"),
    { initialProps: { isActive: false } }
  )

  expect(result.current.expanded).toBe(false)

  rerender({ isActive: true })
  expect(result.current.expanded).toBe(true)

  act(() => {
    result.current.toggle()
  })
  expect(result.current.expanded).toBe(false)

  rerender({ isActive: false })
  expect(result.current.expanded).toBe(false)
  rerender({ isActive: true })
  expect(result.current.expanded).toBe(false)
})
