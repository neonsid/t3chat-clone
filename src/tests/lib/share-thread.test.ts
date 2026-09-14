import { describe, expect, it } from "vitest"

import {
  shareViewedStorageKey,
  toShareAttachments,
  toShareGenerationStats,
  toShareUiMessage,
} from "@/lib/share-thread"

describe("share thread helpers", () => {
  it("builds a viewed key per public id", () => {
    expect(shareViewedStorageKey("9gf0h8gtga")).toBe(
      "t3chat.share.viewed.9gf0h8gtga"
    )
  })

  it("maps share messages into ui messages", () => {
    const message = toShareUiMessage({
      messageId: "m1",
      role: "assistant",
      content: "Hello",
      thinking: "Hmm",
      createdAt: 1_700_000_000_000,
    })
    expect(message.id).toBe("m1")
    expect(message.role).toBe("assistant")
    expect(message.parts).toEqual([
      { type: "thinking", content: "Hmm" },
      { type: "text", content: "Hello" },
    ])
  })

  it("never uses the owner download path for shared attachments", () => {
    const attachments = toShareAttachments(
      [
        {
          attachmentId: "att-1",
          messageId: "m1",
          filename: "shot.png",
          kind: "image",
        },
      ],
      { "att-1": "https://files.example/shot.png" }
    )
    expect(attachments[0]).toMatchObject({
      src: "https://files.example/shot.png",
      hideDownload: true,
    })
  })

  it("projects generation stats the same way as stored chats", () => {
    const stats = toShareGenerationStats({
      modelId: "gpt-5",
      modelName: "GPT-5",
      reasoningEffort: "low",
      outputTokens: 100,
      durationMs: 2000,
      timeToFirstTokenMs: 500,
    })
    expect(stats).toMatchObject({
      modelName: "GPT-5",
      mode: "Low",
      outputTokens: 100,
      tokensPerSecond: 100 / 1.5,
      timeToFirstTokenSeconds: 0.5,
    })
  })
})
