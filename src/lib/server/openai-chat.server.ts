import { chat } from "@tanstack/ai"
import type { ContentPart } from "@tanstack/ai"
import { OpenAITextAdapter, openaiText } from "@tanstack/ai-openai"

import type { ChatExecutor } from "@/lib/server/chat-executor-types"
import { openaiInputFileFromDocumentPart } from "@/lib/server/openai-document-input"
import { MAX_MODEL_OUTPUT_TOKENS } from "@/lib/chat-models"

type OpenAIChatModelId = Parameters<typeof openaiText>[0]

class OpenAITextAdapterWithDocuments extends OpenAITextAdapter<OpenAIChatModelId> {
  protected override convertContentPartToInput(part: ContentPart) {
    if (part.type === "document") {
      return openaiInputFileFromDocumentPart(part)
    }
    return super.convertContentPartToInput(part)
  }
}

export const streamOpenAIChat: ChatExecutor = ({
  runtime,
  messages,
  providerReasoningEffort,
  abortController,
}) => {
  if (runtime.kind !== "openai") throw new Error("Invalid OpenAI runtime")

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured")
  const adapter = new OpenAITextAdapterWithDocuments(
    { apiKey },
    runtime.adapterModelId as OpenAIChatModelId
  )

  return chat({
    adapter,
    messages: [...messages],
    modelOptions: {
      max_output_tokens: MAX_MODEL_OUTPUT_TOKENS,
      ...(providerReasoningEffort
        ? {
            reasoning: {
              effort: providerReasoningEffort,
              ...(providerReasoningEffort === "none"
                ? {}
                : { summary: "auto" as const }),
            },
          }
        : {}),
    },
    abortController,
  })
}
