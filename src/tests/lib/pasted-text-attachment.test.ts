import { describe, expect, it } from "vitest"

import {
  PASTED_TEXT_FILENAME_PREFIX,
  PASTED_TEXT_WORD_LIMIT,
  TXT_MIME_TYPE,
} from "@/lib/attachment-limits"
import {
  countPastedWords,
  createPastedTextFile,
  nextPastedTextFilename,
  shouldAttachPastedText,
} from "@/lib/pasted-text-attachment"

describe("shouldAttachPastedText", () => {
  it("keeps pastes at the word limit in the composer", () => {
    const text = Array.from({ length: PASTED_TEXT_WORD_LIMIT }, () => "word").join(
      " "
    )
    expect(countPastedWords(text)).toBe(PASTED_TEXT_WORD_LIMIT)
    expect(shouldAttachPastedText(text)).toBe(false)
  })

  it("turns longer pastes into a text file", () => {
    const text = Array.from(
      { length: PASTED_TEXT_WORD_LIMIT + 1 },
      () => "word"
    ).join(" ")
    expect(shouldAttachPastedText(text)).toBe(true)
  })

  it("ignores blank clipboard text", () => {
    expect(shouldAttachPastedText("   \n")).toBe(false)
  })
})

describe("nextPastedTextFilename", () => {
  it("starts at Pasted Text 1", () => {
    expect(nextPastedTextFilename([])).toBe(`${PASTED_TEXT_FILENAME_PREFIX} 1`)
  })

  it("increments past existing pasted chips", () => {
    expect(
      nextPastedTextFilename(["notes.txt", "Pasted Text 1", "Pasted Text 3.txt"])
    ).toBe(`${PASTED_TEXT_FILENAME_PREFIX} 4`)
  })
})

describe("createPastedTextFile", () => {
  it("builds a text/plain file named Pasted Text 1", async () => {
    const file = createPastedTextFile("hello from paste", [])
    expect(file.name).toBe(`${PASTED_TEXT_FILENAME_PREFIX} 1`)
    expect(file.type).toBe(TXT_MIME_TYPE)
    expect(await file.text()).toBe("hello from paste")
  })
})
