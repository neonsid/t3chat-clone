import { describe, expect, it } from "vitest"
import type { UIMessage } from "@tanstack/ai-react"

import { isSameMessageList } from "@/components/chat/thread/logic"

function message(id: string, content: string): UIMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", content }],
    createdAt: new Date(0),
  }
}

describe("isSameMessageList", () => {
  it("holds while the same messages are handed back", () => {
    const messages = [message("one", "First"), message("two", "Second")]

    expect(isSameMessageList(messages, [...messages])).toBe(true)
  })

  it("breaks when a message is appended", () => {
    const first = message("one", "First")

    expect(isSameMessageList([first], [first, message("two", "Second")])).toBe(
      false
    )
  })

  it("breaks when a message is rebuilt in place", () => {
    const first = message("one", "First")
    const second = message("two", "Second")

    // A tool result or approval rebuilds the message that owns the call, which
    // is not necessarily the last one, and keeps its id.
    expect(
      isSameMessageList([first, second], [first, message("two", "Answered")])
    ).toBe(false)
  })
})
