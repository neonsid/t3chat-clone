import { chat, createModel, extendAdapter } from "@tanstack/ai"
import { createGeminiChat } from "@tanstack/ai-gemini"

import type { ChatExecutor } from "@/lib/server/chat-executor-types"
import {
  GEMINI_THINKING_LEVELS,
  MAX_MODEL_OUTPUT_TOKENS,
} from "@/lib/chat-models"

const googleText = extendAdapter(createGeminiChat, [
  createModel("gemini-flash-latest", [
    "text",
    "image",
    "audio",
    "video",
    "document",
  ]),
  createModel("gemini-flash-lite-latest", [
    "text",
    "image",
    "audio",
    "video",
    "document",
  ]),
  createModel("gemini-3.1-pro-preview-customtools", [
    "text",
    "image",
    "audio",
    "video",
    "document",
  ]),
  createModel("gemma-4-26b-a4b-it", ["text", "image"]),
  createModel("gemma-4-31b-it", ["text", "image"]),
] as const)

export const streamGoogleChat: ChatExecutor = ({
  runtime,
  messages,
  providerReasoningEffort,
  abortController,
}) => {
  if (runtime.kind !== "google") throw new Error("Invalid Google runtime")
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error("GOOGLE_API_KEY not configured")

  // Thought summaries require includeThoughts — see
  // https://ai.google.dev/gemini-api/docs/thinking#javascript
  const thinkingLevel =
    providerReasoningEffort && providerReasoningEffort !== "none"
      ? GEMINI_THINKING_LEVELS[providerReasoningEffort]
      : undefined

  return chat({
    adapter: googleText(
      runtime.adapterModelId as Parameters<typeof googleText>[0],
      apiKey
    ),
    messages: [...messages],
    modelOptions: {
      maxOutputTokens: MAX_MODEL_OUTPUT_TOKENS,
      ...(thinkingLevel
        ? {
            thinkingConfig: {
              includeThoughts: true,
              thinkingLevel,
            },
          }
        : {}),
    },
    abortController,
  })
}
