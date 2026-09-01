import { describe, expect, it } from "vitest"

import {
  ATTACHMENT_MODEL_URL_REUSE_MIN_REMAINING_MS,
  canReuseModelDownloadUrl,
} from "../../../convex/attachmentConstants"

describe("canReuseModelDownloadUrl", () => {
  it("reuses a minted url until it is close to expiry", () => {
    const now = 1_700_000_000_000
    expect(
      canReuseModelDownloadUrl(
        now + ATTACHMENT_MODEL_URL_REUSE_MIN_REMAINING_MS + 1,
        now
      )
    ).toBe(true)
    expect(
      canReuseModelDownloadUrl(
        now + ATTACHMENT_MODEL_URL_REUSE_MIN_REMAINING_MS,
        now
      )
    ).toBe(false)
    expect(canReuseModelDownloadUrl(now + 1_000, now)).toBe(false)
  })
})
