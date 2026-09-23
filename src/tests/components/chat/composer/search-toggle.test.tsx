// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"

import { SearchToggle } from "@/components/chat/composer/ComposerToolbar"
import { installJsdomMatchMedia } from "@/tests/jsdom-browser"

installJsdomMatchMedia()

afterEach(() => {
  cleanup()
})

test("search toggle advertises enable vs disable", () => {
  const { getByRole, rerender } = render(
    <SearchToggle
      pressed={false}
      searchLimit={3}
      supported
      disabled={false}
      onPressedChange={() => {}}
      onSearchLimitChange={() => {}}
    />
  )

  expect(
    getByRole("button", { name: "Search" }).getAttribute("aria-pressed")
  ).toBe("false")

  rerender(
    <SearchToggle
      pressed
      searchLimit={3}
      supported
      disabled={false}
      onPressedChange={() => {}}
      onSearchLimitChange={() => {}}
    />
  )

  expect(
    getByRole("button", { name: "Search" }).getAttribute("aria-pressed")
  ).toBe("true")
  expect(getByRole("button", { name: "Search count 3" })).toBeTruthy()
})

test("search limit editor opens from the count and closes without render-phase resets", () => {
  const { getByRole } = render(
    <SearchToggle
      pressed
      searchLimit={3}
      supported
      disabled={false}
      onPressedChange={() => {}}
      onSearchLimitChange={() => {}}
    />
  )

  fireEvent.click(getByRole("button", { name: "Search count 3" }))
  expect(getByRole("group", { name: "Search count" })).toBeTruthy()
  fireEvent.click(getByRole("button", { name: "Done" }))
  expect(getByRole("button", { name: "Search count 3" })).toBeTruthy()
})
