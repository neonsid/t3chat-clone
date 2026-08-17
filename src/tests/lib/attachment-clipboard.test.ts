import { describe, expect, test } from "vitest"

import { formatUserMessageClipboard } from "@/lib/attachment-clipboard"

describe("formatUserMessageClipboard", () => {
  test("returns text when there are no attachments", () => {
    expect(formatUserMessageClipboard("Hello", [])).toBe("Hello")
  })

  test("formats attachment markdown with optional prompt text", () => {
    const attachments = [
      {
        filename: "WhatsApp Image 2026-04-14 at 9.18.24 PM.jpeg",
        url: "https://example.com/a.jpeg",
      },
      { filename: "2.png", url: "https://example.com/2.png" },
    ]

    expect(formatUserMessageClipboard("What is in this image?", attachments))
      .toBe(`What is in this image?

Attachments:
[WhatsApp Image 2026-04-14 at 9.18.24 PM.jpeg](https://example.com/a.jpeg)
[2.png](https://example.com/2.png)`)

    expect(formatUserMessageClipboard("  ", attachments)).toBe(
      `Attachments:
[WhatsApp Image 2026-04-14 at 9.18.24 PM.jpeg](https://example.com/a.jpeg)
[2.png](https://example.com/2.png)`
    )
  })
})
