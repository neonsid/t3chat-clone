import { ConvexError } from "convex/values"
import { describe, expect, it } from "vitest"

import { PLAN_QUOTAS, USAGE_LIMIT_CODE } from "../../../convex/billingConstants"
import {
  isOverQuota,
  isUsageLimitError,
  planIdFromProductKey,
  resolveUsagePeriod,
  splitUsageDuration,
} from "../../../convex/billingLogic"

describe("planIdFromProductKey", () => {
  it("maps Polar product keys and treats anything else as free", () => {
    expect(planIdFromProductKey("pro")).toBe("pro")
    expect(planIdFromProductKey("premier")).toBe("premier")
    expect(planIdFromProductKey("premiumMonthly")).toBe("free")
    expect(planIdFromProductKey(undefined)).toBe("free")
  })
})

describe("resolveUsagePeriod", () => {
  it("uses Polar period bounds for paid plans", () => {
    expect(
      resolveUsagePeriod({
        now: 1_000,
        planId: "pro",
        polarPeriodStart: "2026-08-01T00:00:00.000Z",
        polarPeriodEnd: "2026-09-01T00:00:00.000Z",
      })
    ).toEqual({
      periodStart: Date.parse("2026-08-01T00:00:00.000Z"),
      periodEnd: Date.parse("2026-09-01T00:00:00.000Z"),
    })
  })

  it("keeps an unexpired free window", () => {
    const existing = { periodStart: 1_000, periodEnd: 10_000 }
    expect(
      resolveUsagePeriod({
        now: 5_000,
        planId: "free",
        existing,
      })
    ).toEqual(existing)
  })

  it("opens a new 24h window when the free period has elapsed", () => {
    const now = 20_000
    expect(
      resolveUsagePeriod({
        now,
        planId: "free",
        existing: { periodStart: 1_000, periodEnd: 10_000 },
      })
    ).toEqual({
      periodStart: now,
      periodEnd: now + 24 * 60 * 60 * 1000,
    })
  })
})

describe("quota math", () => {
  it("rejects when combined usage meets the combined cap", () => {
    const quotas = PLAN_QUOTAS.free
    expect(isOverQuota(quotas.baseMs, 0, "free")).toBe(true)
    expect(isOverQuota(0, 0, "free")).toBe(false)
  })

  it("fills base first, then burst", () => {
    expect(splitUsageDuration(0, 1_000, 4_000)).toEqual({
      baseMs: 1_000,
      burstMs: 0,
      bucket: "base",
    })
    expect(splitUsageDuration(3_500, 1_000, 4_000)).toEqual({
      baseMs: 500,
      burstMs: 500,
      bucket: "burst",
    })
  })

  it("detects a usage-limit Convex error", () => {
    expect(
      isUsageLimitError(
        new ConvexError({ code: USAGE_LIMIT_CODE, message: "nope" })
      )
    ).toBe(true)
    expect(isUsageLimitError(new ConvexError("nope"))).toBe(false)
    expect(isUsageLimitError(new Error("nope"))).toBe(false)
  })
})
