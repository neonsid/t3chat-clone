import { describe, expect, it } from "vitest"

import { shouldDeleteSharedObject } from "@/lib/attachment-object-refs"

describe("shouldDeleteSharedObject", () => {
  it("deletes the object when this batch holds the last live rows", () => {
    expect(
      shouldDeleteSharedObject({
        batchDocIds: new Set(["a", "b"]),
        siblings: [
          { _id: "a", status: "deleting" },
          { _id: "b", status: "deleting" },
        ],
      })
    ).toBe(true)
  })

  it("keeps the object when another ready row still uses the key", () => {
    expect(
      shouldDeleteSharedObject({
        batchDocIds: new Set(["a"]),
        siblings: [
          { _id: "a", status: "deleting" },
          { _id: "clone", status: "ready" },
        ],
      })
    ).toBe(false)
  })

  it("ignores siblings that are already deleting", () => {
    expect(
      shouldDeleteSharedObject({
        batchDocIds: new Set(["a"]),
        siblings: [
          { _id: "a", status: "deleting" },
          { _id: "stale", status: "deleting" },
        ],
      })
    ).toBe(true)
  })
})
