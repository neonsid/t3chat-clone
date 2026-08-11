import { describe, expect, it } from "vitest"
import type { UIMessage } from "@tanstack/ai-react"

import {
  isSameMessageList,
  resolveFrozenStreamingHistory,
} from "@/components/chat/thread/logic"

function message(
  id: string,
  content: string,
  role: UIMessage["role"] = "assistant"
): UIMessage {
  return {
    id,
    role,
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

describe("resolveFrozenStreamingHistory", () => {
  it("keeps the previous history identity across streaming chunks", () => {
    const user = message("u1", "Hello", "user")
    const priorHistory = [user]
    const chunkHistory = [user]

    const frozen = resolveFrozenStreamingHistory(
      priorHistory,
      chunkHistory,
      true
    )

    expect(frozen).toBe(priorHistory)
    expect(resolveFrozenStreamingHistory(frozen, [user], true)).toBe(
      priorHistory
    )
  })

  it("adopts a new history source when streaming settles", () => {
    const user = message("u1", "Hello", "user")
    const settled = [user, message("a1", "Done")]

    expect(resolveFrozenStreamingHistory([user], settled, false)).toBe(settled)
  })

  it("adopts a new source when a non-tail history message is rebuilt", () => {
    const first = message("one", "First", "user")
    const second = message("two", "Second", "user")
    const rebuiltSecond = message("two", "Edited", "user")

    expect(
      resolveFrozenStreamingHistory(
        [first, second],
        [first, rebuiltSecond],
        true
      )
    ).toEqual([first, rebuiltSecond])
  })
})
