import { describe, expect, it } from "vitest"

import { resolveChatModel } from "@/lib/chat-models"
import { streamChatModel } from "@/lib/server/chat-model-executors.server"

const liveDescribe =
  process.env.LIVE_AI_SMOKE_TESTS === "1" ? describe : describe.skip

async function smokeModel(modelId: string) {
  const model = resolveChatModel(modelId, "instant")
  if (!model) throw new Error(`Missing smoke-test model: ${modelId}`)

  let text = ""
  for await (const chunk of streamChatModel({
    runtime: model.runtime,
    providerReasoningEffort: model.providerReasoningEffort,
    messages: [{ role: "user", content: "Reply with only the word OK." }],
    abortController: new AbortController(),
  })) {
    if (chunk.type === "TEXT_MESSAGE_CONTENT") text += chunk.delta
    if (chunk.type === "RUN_ERROR") throw new Error(chunk.message)
  }

  expect(text.trim().toUpperCase()).toContain("OK")
}

liveDescribe("free provider smoke tests", () => {
  it(
    "streams from direct Gemini",
    () => smokeModel("google/gemini-3.1-flash-lite"),
    60_000
  )

  it(
    "streams from OpenRouter",
    () => smokeModel("cohere/north-mini-code-1-0"),
    60_000
  )
})
