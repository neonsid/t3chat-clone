import { describe, expect, it } from "vitest"

import type { Doc, Id } from "../../../convex/_generated/dataModel"
import { toChatMessages } from "@/lib/threads"

const storedMessageBase = {
  _id: "message-id" as Id<"messages">,
  _creationTime: 1,
  threadId: "thread-id" as Id<"threads">,
  messageId: "message-1",
  sequence: 0,
  role: "assistant" as const,
  status: "complete" as const,
  createdAt: 1,
}

describe("toChatMessages", () => {
  it("converts scalar text fields into UI message parts", () => {
    const messages = toChatMessages([
      {
        ...storedMessageBase,
        content: "Plain response",
        thinking: "Reasoning",
      } satisfies Doc<"messages">,
    ])

    expect(messages[0]?.parts).toEqual([
      { type: "thinking", content: "Reasoning" },
      { type: "text", content: "Plain response" },
    ])
  })

  it("continues to read legacy JSON parts during migration", () => {
    const messages = toChatMessages([
      {
        ...storedMessageBase,
        parts: [
          { type: "thinking", content: "Legacy reasoning" },
          { type: "text", content: "Legacy response" },
        ],
      } satisfies Doc<"messages">,
    ])

    expect(messages[0]?.parts).toEqual([
      { type: "thinking", content: "Legacy reasoning" },
      { type: "text", content: "Legacy response" },
    ])
  })
})
