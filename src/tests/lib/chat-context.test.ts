import { describe, expect, it } from "vitest"

import {
  contextRequiresPdf,
  contextRequiresVision,
  contextToModelMessages,
  requestMessagesToContext,
} from "@/lib/chat-context"
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

  it("builds image and pdf parts from signed urls", () => {
    expect(
      contextToModelMessages([
        {
          role: "user",
          content: "",
          attachments: [
            {
              attachmentId: "a1",
              kind: "image",
              mimeType: "image/png",
              filename: "shot.png",
              sizeBytes: 10,
              url: "https://example.com/shot.png",
            },
            {
              attachmentId: "a2",
              kind: "pdf",
              mimeType: "application/pdf",
              filename: "doc.pdf",
              sizeBytes: 20,
              url: "https://example.com/doc.pdf",
            },
          ],
        },
      ])
    ).toEqual([
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "url",
              value: "https://example.com/shot.png",
              mimeType: "image/png",
            },
          },
          {
            type: "document",
            source: {
              type: "url",
              value: "https://example.com/doc.pdf",
              mimeType: "application/pdf",
            },
          },
        ],
      },
    ])
  })

  it("detects vision and pdf requirements across context", () => {
    const messages = [
      {
        role: "user" as const,
        content: "hi",
        attachments: [
          {
            attachmentId: "a1",
            kind: "image" as const,
            mimeType: "image/jpeg",
            filename: "a.jpg",
            sizeBytes: 1,
          },
        ],
      },
      {
        role: "user" as const,
        content: "pdf",
        attachments: [
          {
            attachmentId: "a2",
            kind: "pdf" as const,
            mimeType: "application/pdf",
            filename: "b.pdf",
            sizeBytes: 1,
          },
        ],
      },
    ]
    expect(contextRequiresVision(messages)).toBe(true)
    expect(contextRequiresPdf(messages)).toBe(true)
  })
})

describe("requestMessagesToContext", () => {
  it("attaches files to the matching user message and skips empty shells", () => {
    expect(
      requestMessagesToContext(
        [
          { role: "system", content: "ignore", thinking: "" },
          { role: "user", id: "u1", content: "", thinking: "" },
          {
            role: "assistant",
            id: "a1",
            content: "done",
            thinking: "notes",
          },
        ],
        {
          u1: [
            {
              attachmentId: "att-1",
              kind: "image",
              mimeType: "image/png",
              filename: "shot.png",
              sizeBytes: 12,
              url: "https://example.com/shot.png",
            },
          ],
        }
      )
    ).toEqual([
      {
        role: "user",
        content: "",
        thinking: undefined,
        attachments: [
          {
            attachmentId: "att-1",
            kind: "image",
            mimeType: "image/png",
            filename: "shot.png",
            sizeBytes: 12,
            url: "https://example.com/shot.png",
          },
        ],
      },
      {
        role: "assistant",
        content: "done",
        thinking: "notes",
        attachments: [],
      },
    ])
  })
})
