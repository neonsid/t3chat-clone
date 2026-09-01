import { describe, expect, it } from "vitest"
import type { UIMessage } from "@tanstack/ai-react"

import {
  isSameMessageList,
  resolveAssistantMessageChrome,
  resolveFrozenStreamingHistory,
  resolveMessageThinkingSearchSplitAt,
  resolveMessageWebSearchQueries,
  resolveMessageWebSearchSources,
  splitThinkingAroundSearch,
  webSearchToolCallCount,
  webSearchToolCallLabel,
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

describe("resolveMessageWebSearchSources", () => {
  const persisted = {
    older: [{ title: "Old", url: "https://old.example" }],
  }
  const turn = [{ title: "Turn", url: "https://turn.example" }]

  it("prefers live turn sources on the streaming message", () => {
    expect(
      resolveMessageWebSearchSources({
        messageId: "assistant-2",
        isStreamingMessage: true,
        persisted,
        turnSources: turn,
        lastAssistantMessageId: "assistant-2",
      })
    ).toBe(turn)
  })

  it("falls back to turn sources for the last assistant after the stream", () => {
    expect(
      resolveMessageWebSearchSources({
        messageId: "assistant-2",
        isStreamingMessage: false,
        persisted,
        turnSources: turn,
        lastAssistantMessageId: "assistant-2",
      })
    ).toBe(turn)
  })

  it("keeps persisted sources on earlier messages", () => {
    expect(
      resolveMessageWebSearchSources({
        messageId: "older",
        isStreamingMessage: false,
        persisted,
        turnSources: turn,
        lastAssistantMessageId: "assistant-2",
      })
    ).toBe(persisted.older)
  })
})

describe("resolveMessageWebSearchQueries", () => {
  const persisted = {
    older: ["old query"],
  }
  const turn = ["live query"]

  it("prefers live turn queries on the streaming message", () => {
    expect(
      resolveMessageWebSearchQueries({
        messageId: "assistant-2",
        isStreamingMessage: true,
        persisted,
        turnQueries: turn,
        lastAssistantMessageId: "assistant-2",
      })
    ).toBe(turn)
  })
})

describe("splitThinkingAroundSearch", () => {
  it("keeps all thinking before search when no split exists", () => {
    expect(splitThinkingAroundSearch("plan then search", undefined)).toEqual({
      before: "plan then search",
      after: "",
    })
  })

  it("splits thinking at the search boundary", () => {
    expect(splitThinkingAroundSearch("plan eval", 5)).toEqual({
      before: "plan ",
      after: "eval",
    })
  })
})

describe("resolveMessageThinkingSearchSplitAt", () => {
  it("prefers the live split on the streaming message", () => {
    expect(
      resolveMessageThinkingSearchSplitAt({
        messageId: "assistant-2",
        isStreamingMessage: true,
        persisted: { older: 3 },
        turnSplitAt: 8,
        lastAssistantMessageId: "assistant-2",
      })
    ).toBe(8)
  })
})

describe("resolveAssistantMessageChrome", () => {
  it("keeps search hidden while reasoning is still streaming", () => {
    expect(
      resolveAssistantMessageChrome({
        thinkingBefore: "Need current sources",
        thinkingAfter: "",
        text: "",
        isStreaming: true,
        sourcesCount: 0,
        queriesCount: 0,
        isSearchingWeb: true,
      })
    ).toMatchObject({
      showReasoningBefore: true,
      isStreamingThinkingBefore: true,
      showReasoningAfter: false,
      showWebSearch: false,
    })
  })

  it("starts search and closes live reasoning once a query arrives", () => {
    expect(
      resolveAssistantMessageChrome({
        thinkingBefore: "Need current sources",
        thinkingAfter: "",
        text: "",
        isStreaming: true,
        sourcesCount: 0,
        queriesCount: 1,
        isSearchingWeb: true,
      })
    ).toMatchObject({
      isStreamingThinkingBefore: false,
      showWebSearch: true,
      isSearching: true,
    })
  })

  it("opens a second reasoning block after search", () => {
    expect(
      resolveAssistantMessageChrome({
        thinkingBefore: "Need current sources",
        thinkingAfter: "These results look current",
        text: "",
        isStreaming: true,
        sourcesCount: 1,
        queriesCount: 1,
        isSearchingWeb: true,
      })
    ).toMatchObject({
      showReasoningBefore: true,
      isStreamingThinkingBefore: false,
      showReasoningAfter: true,
      isStreamingThinkingAfter: true,
      showWebSearch: true,
      isSearching: false,
    })
  })

  it("shows search immediately when there is no reasoning", () => {
    expect(
      resolveAssistantMessageChrome({
        thinkingBefore: "",
        thinkingAfter: "",
        text: "",
        isStreaming: true,
        sourcesCount: 0,
        queriesCount: 0,
        isSearchingWeb: true,
      })
    ).toMatchObject({
      isStreamingThinkingBefore: false,
      showWebSearch: true,
      isSearching: true,
    })
  })
})

describe("webSearchToolCallCount", () => {
  it("counts search queries as tool calls and falls back to one when only sources exist", () => {
    expect(webSearchToolCallCount(0, 0)).toBe(0)
    expect(webSearchToolCallCount(1, 4)).toBe(1)
    expect(webSearchToolCallCount(3, 8)).toBe(3)
    expect(webSearchToolCallCount(0, 2)).toBe(1)
    expect(webSearchToolCallLabel(1)).toBe("1 tool call")
    expect(webSearchToolCallLabel(3)).toBe("3 tool calls")
  })
})
