import { describe, expect, it } from "vitest"

import {
  MAX_DOCX_EXTRACTED_CHARS,
  prepareExtractedDocxText,
  prepareExtractedPlainText,
} from "@/lib/docx-extract"
import { estimateTextTokens } from "@/lib/token-estimate"

describe("prepareExtractedDocxText", () => {
  it("fails on empty extract", () => {
    expect(prepareExtractedDocxText("   \n", "notes.docx")).toEqual({
      ok: false,
      error: "Couldn't read any text from this Word file",
    })
  })

  it("prefixes the filename and estimates tokens", () => {
    const result = prepareExtractedDocxText("Hello world", "notes.docx")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extractedText).toBe("notes.docx\n\nHello world")
    expect(result.extractedTokenEstimate).toBe(
      estimateTextTokens(result.extractedText)
    )
    expect(result.truncated).toBe(false)
  })

  it("truncates long extracts and prepends a note", () => {
    const result = prepareExtractedDocxText(
      "x".repeat(MAX_DOCX_EXTRACTED_CHARS + 50),
      "big.docx"
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.truncated).toBe(true)
    expect(result.extractedText.startsWith("big.docx\n\n")).toBe(true)
    expect(result.extractedText).toContain(
      "Extract truncated to the first 200000 characters."
    )
    expect(result.extractedText.length).toBeLessThan(
      MAX_DOCX_EXTRACTED_CHARS + 80
    )
  })
})

describe("prepareExtractedPlainText", () => {
  it("fails on empty extract", () => {
    expect(prepareExtractedPlainText("   \n", "Pasted Text 1")).toEqual({
      ok: false,
      error: "Couldn't read any text from this file",
    })
  })
})
