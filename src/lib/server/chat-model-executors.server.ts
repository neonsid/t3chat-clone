import type { ChatExecutorOptions } from "@/lib/server/chat-executor-types"
import { streamGoogleChat } from "@/lib/server/google-chat.server"
import { streamOpenAIChat } from "@/lib/server/openai-chat.server"
import { streamOpenRouterChat } from "@/lib/server/openrouter-chat.server"
import type { ChatModelRuntime } from "@/lib/chat-models"

export function getMissingRuntimeKey(runtime: ChatModelRuntime): string | null {
  if (runtime.kind === "openai" && !process.env.OPENAI_API_KEY) {
    return "OPENAI_API_KEY not configured"
  }
  if (runtime.kind === "google" && !process.env.GOOGLE_API_KEY) {
    return "GOOGLE_API_KEY not configured"
  }
  if (runtime.kind === "openrouter" && !process.env.OPENROUTER_API_KEY) {
    return "OPENROUTER_API_KEY not configured"
  }
  return null
}

export function streamChatModel(options: ChatExecutorOptions) {
  switch (options.runtime.kind) {
    case "openai":
      return streamOpenAIChat(options)
    case "google":
      return streamGoogleChat(options)
    case "openrouter":
      return streamOpenRouterChat(options)
  }
}
