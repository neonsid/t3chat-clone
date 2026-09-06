import { describe, expect, it } from "vitest"

import {
  SHARE_PUBLIC_ID_LENGTH,
  createSharePublicId,
  formatShareAge,
  isSharePublicId,
  sharePath,
  shareUrl,
} from "@/lib/share-id"

describe("share public ids", () => {
  it("mints a 10-character lowercase id", () => {
    const publicId = createSharePublicId(() =>
      Uint8Array.from([0, 1, 25, 26, 35, 10, 11, 12, 13, 14])
    )
    expect(publicId).toBe("abz09klmno")
    expect(publicId).toHaveLength(SHARE_PUBLIC_ID_LENGTH)
    expect(isSharePublicId(publicId)).toBe(true)
  })

  it("rejects ids that are the wrong length or alphabet", () => {
    expect(isSharePublicId("abcdefghi")).toBe(false)
    expect(isSharePublicId("abcdefghiJ")).toBe(false)
    expect(isSharePublicId("abcd-fghij")).toBe(false)
  })

  it("builds share paths and absolute urls", () => {
    expect(sharePath("9gf0h8gtga")).toBe("/share/9gf0h8gtga")
    expect(shareUrl("https://t3.chat", "9gf0h8gtga")).toBe(
      "https://t3.chat/share/9gf0h8gtga"
    )
  })
})

describe("formatShareAge", () => {
  const now = 1_700_000_000_000

  it("uses minute, hour, and day buckets", () => {
    expect(formatShareAge(now - 20_000, now)).toBe("less than a minute ago")
    expect(formatShareAge(now - 60_000, now)).toBe("1 minute ago")
    expect(formatShareAge(now - 3 * 60_000, now)).toBe("3 minutes ago")
    expect(formatShareAge(now - 60 * 60_000, now)).toBe("1 hour ago")
    expect(formatShareAge(now - 5 * 60 * 60_000, now)).toBe("5 hours ago")
    expect(formatShareAge(now - 24 * 60 * 60_000, now)).toBe("1 day ago")
    expect(formatShareAge(now - 8 * 24 * 60 * 60_000, now)).toBe("8 days ago")
  })
})
