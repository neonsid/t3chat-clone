import { describe, expect, it } from "vitest"

import { contextToModelMessages } from "@/lib/chat-context"
import { MAX_MODEL_CONTEXT_CHARACTERS } from "@/lib/chat-models"

describe("contextToModelMessages", () => {
  it("maps assistant thinking onto ModelMessage.thinking", () => {
    expect(
      contextToModelMessages([
        { role: "user", content: "What is caching?" },
        {
          role: "assistant",
          content: "Caching stores results for reuse.",
          thinking: "Define caching, then explain reuse.",
        },
      ])
    ).toEqual([
      { role: "user", content: "What is caching?" },
      {
        role: "assistant",
        content: "Caching stores results for reuse.",
        thinking: [{ content: "Define caching, then explain reuse." }],
      },
    ])
  })

  it("keeps assistant thinking-only messages and skips empty shells", () => {
    expect(
      contextToModelMessages([
        { role: "assistant", content: "", thinking: "   " },
        { role: "assistant", content: "", thinking: "Only thoughts" },
        { role: "user", content: "Follow up" },
      ])
    ).toEqual([
      {
        role: "assistant",
        content: "",
        thinking: [{ content: "Only thoughts" }],
      },
      { role: "user", content: "Follow up" },
    ])
  })

  it("counts thinking toward the character budget", () => {
    const older = "a".repeat(1_000)
    const thinking = "t".repeat(MAX_MODEL_CONTEXT_CHARACTERS - 200)
    const newer = "b".repeat(100)

    const selected = contextToModelMessages([
      { role: "user", content: older },
      {
        role: "assistant",
        content: "answer",
        thinking,
      },
      { role: "user", content: newer },
    ])

    expect(selected).toEqual([
      {
        role: "assistant",
        content: "answer",
        thinking: [{ content: thinking }],
      },
      { role: "user", content: newer },
    ])
  })
})
