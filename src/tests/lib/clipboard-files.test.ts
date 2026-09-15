import { describe, expect, it } from "vitest"

import { filesFromClipboard, namedClipboardFile } from "@/lib/clipboard-files"

function fakeFile(name: string, type: string) {
  return new File([new Uint8Array([1, 2, 3])], name, { type })
}

describe("namedClipboardFile", () => {
  it("keeps a named screenshot", () => {
    const file = fakeFile("image.png", "image/png")
    expect(namedClipboardFile(file)).toBe(file)
  })

  it("names a typeless clipboard blob from the mime", () => {
    const file = fakeFile("", "image/png")
    const named = namedClipboardFile(file)
    expect(named.name).toBe("image.png")
    expect(named.type).toBe("image/png")
  })
})

describe("filesFromClipboard", () => {
  it("prefers clipboard.files when the browser fills it", () => {
    const png = fakeFile("image.png", "image/png")
    expect(
      filesFromClipboard({
        files: [png],
        items: [{ kind: "file", getAsFile: () => png }],
      })
    ).toEqual([png])
  })

  it("falls back to clipboard items when files is empty", () => {
    const png = fakeFile("image.png", "image/png")
    const files = filesFromClipboard({
      files: [],
      items: [
        { kind: "string", getAsFile: () => null },
        { kind: "file", getAsFile: () => png },
      ],
    })
    expect(files).toEqual([png])
  })
})
