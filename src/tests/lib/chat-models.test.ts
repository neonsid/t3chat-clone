import { describe, expect, it } from "vitest"

import { CHAT_MODEL_CONFIG, resolveChatModel } from "@/lib/chat-models"

describe("chat model reasoning profiles", () => {
  it("maps GPT-5.4 Mini Instant to none", () => {
    expect(
      resolveChatModel("openai/gpt-5.4-mini", "instant")
        ?.providerReasoningEffort
    ).toBe("none")
  })

  it("uses explicit Pro defaults and rejects unsupported efforts", () => {
    expect(CHAT_MODEL_CONFIG["openai/gpt-5.5-pro"].defaultReasoningEffort).toBe(
      "high"
    )
    expect(resolveChatModel("openai/gpt-5.5-pro", "instant")).toBeNull()
  })

  // The view reads this to decide whether a silent gap before the first token
  // is reasoning or just latency, so instant meaning different things per
  // provider is load-bearing rather than trivia.
  it("keeps Gemini thinking minimally on instant", () => {
    expect(
      resolveChatModel("google/gemini-3.1-flash-lite", "instant")
        ?.providerReasoningEffort
    ).toBe("minimal")
  })

  it("leaves a model without effort control with no reasoning effort at all", () => {
    const model = resolveChatModel("google/gemma-4-31b-it", "instant")

    expect(model?.supportedReasoningEfforts).toEqual(["instant"])
    expect(model?.providerReasoningEffort).toBeUndefined()
  })

  it("routes free smoke-test models through their intended providers", () => {
    expect(CHAT_MODEL_CONFIG["google/gemini-3.1-flash-lite"].runtime.kind).toBe(
      "google"
    )
    expect(CHAT_MODEL_CONFIG["cohere/north-mini-code-1-0"].runtime.kind).toBe(
      "openrouter"
    )
  })
})
