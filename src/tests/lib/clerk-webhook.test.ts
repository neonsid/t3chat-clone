import { describe, expect, it } from "vitest"

import { parseClerkDeletedWebhook } from "../../../convex/helpers/clerkWebhook"

describe("parseClerkDeletedWebhook", () => {
  it("reads a user.deleted event and ignores extra Clerk fields", () => {
    expect(
      parseClerkDeletedWebhook(
        JSON.stringify({
          type: "user.deleted",
          object: "event",
          data: {
            id: "user_123",
            deleted: true,
            object: "user",
          },
        })
      )
    ).toEqual({ kind: "user.deleted", clerkUserId: "user_123" })
  })

  it("ignores other Clerk event types", () => {
    expect(
      parseClerkDeletedWebhook(
        JSON.stringify({
          type: "user.updated",
          data: { id: "user_123" },
        })
      )
    ).toEqual({ kind: "ignored" })
  })

  it("rejects invalid JSON", () => {
    expect(parseClerkDeletedWebhook("{not json")).toEqual({
      kind: "invalid-json",
    })
  })
})
