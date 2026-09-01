import { describe, expect, it } from "vitest"

import {
  COMPOSER_STREAM_ERROR,
  SEARCH_TOGGLE,
} from "@/components/chat/composer/constants"
import {
  composerStreamErrorMessage,
  webSearchTooltip,
} from "@/components/chat/composer/logic"

describe("webSearchTooltip", () => {
  it("uses the unsupported copy when the model cannot search", () => {
    expect(webSearchTooltip(false, true)).toBe(SEARCH_TOGGLE.unsupportedTooltip)
    expect(webSearchTooltip(false, false)).toBe(
      SEARCH_TOGGLE.unsupportedTooltip
    )
  })

  it("toggles enable and disable copy for OpenAI models", () => {
    expect(webSearchTooltip(true, false)).toBe(SEARCH_TOGGLE.enableTooltip)
    expect(webSearchTooltip(true, true)).toBe(SEARCH_TOGGLE.disableTooltip)
  })
})

describe("composerStreamErrorMessage", () => {
  it("hides Convex validator dumps", () => {
    expect(
      composerStreamErrorMessage(
        new Error(
          'ArgumentValidationError: Object contains extra field `searchQueries`\nValidator: v.object({ content: v.string() })'
        )
      )
    ).toBe(COMPOSER_STREAM_ERROR.saveFailed)
  })

  it("keeps short model errors", () => {
    expect(composerStreamErrorMessage(new Error("Rate limited"))).toBe(
      "Rate limited"
    )
  })
})
