import { describe, expect, it } from "vitest"

import { highlightCode } from "@/lib/highlight-code"

describe("highlightCode", () => {
  it("colors typescript keywords", async () => {
    const result = await highlightCode("const x = 1", "ts")
    const tokens = result.tokens.flat()
    const constToken = tokens.find((token) => token.content === "const")
    expect(constToken?.htmlStyle?.color ?? constToken?.color).toBeTruthy()
  })

  it("leaves unknown languages uncolored", async () => {
    const result = await highlightCode("hello", "not-a-language")
    expect(result.tokens).toEqual([[{ content: "hello" }]])
  })
})
