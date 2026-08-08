import { chatParamsFromRequest, toServerSentEventsResponse } from "@tanstack/ai"
import type { ModelMessage, StreamChunk, UIMessage } from "@tanstack/ai"
import { auth } from "@clerk/tanstack-react-start/server"
import { createFileRoute } from "@tanstack/react-router"
import { ConvexHttpClient } from "convex/browser"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  CHAT_MODEL_CATALOG,
  MAX_MODEL_CONTEXT_CHARACTERS,
  REASONING_EFFORTS,
  resolveChatModel,
} from "@/lib/chat-models"
import type { ReasoningEffort } from "@/lib/chat-models"
import {
  getMissingRuntimeKey,
  streamChatModel,
} from "@/lib/server/chat-model-executors.server"

const modelNames = new Map(
  CHAT_MODEL_CATALOG.map((model) => [model.id, model.name])
)

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return REASONING_EFFORTS.some((effort) => effort === value)
}

function textFromMessage(message: UIMessage | ModelMessage) {
  if ("parts" in message && Array.isArray(message.parts)) {
    return message.parts
      .filter(
        (part): part is { type: "text"; content: string } =>
          part.type === "text" && typeof part.content === "string"
      )
      .map((part) => part.content)
      .join("\n")
      .trim()
  }
  return "content" in message && typeof message.content === "string"
    ? message.content.trim()
    : ""
}

function latestUserMessage(messages: Array<UIMessage | ModelMessage>) {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message.role !== "user") continue
    const content = textFromMessage(message)
    const id =
      "id" in message && typeof message.id === "string" ? message.id : null
    if (content && id) return { id, content }
  }
  return null
}

function contextToModelMessages(
  messages: Array<{
    role: "user" | "assistant"
    content: string
  }>
): ModelMessage[] {
  const selected: ModelMessage[] = []
  let characterCount = 0

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    const content = message.content.trim()
    if (!content) continue
    if (
      selected.length > 0 &&
      characterCount + content.length > MAX_MODEL_CONTEXT_CHARACTERS
    ) {
      break
    }
    selected.push({ role: message.role, content })
    characterCount += content.length
  }

  return selected.reverse()
}

function collectAndPersistStream({
  stream,
  convex,
  threadId,
  runId,
  completionSecret,
  modelId,
  modelName,
  reasoningEffort,
  startedAt,
  signal,
}: {
  stream: AsyncIterable<StreamChunk>
  convex: ConvexHttpClient
  threadId: Id<"threads">
  runId: string
  completionSecret: string
  modelId: string
  modelName: string
  reasoningEffort: ReasoningEffort
  startedAt: number
  signal: AbortSignal
}): AsyncIterable<StreamChunk> {
  return (async function* () {
    let assistantMessageId: string | undefined
    let text = ""
    let thinking = ""
    let firstTokenAt: number | undefined
    let outputTokens = 0
    let finished = false

    const generation = () => ({
      modelId,
      modelName,
      reasoningEffort,
      outputTokens,
      durationMs: Date.now() - startedAt,
      timeToFirstTokenMs: firstTokenAt ? firstTokenAt - startedAt : 0,
    })

    try {
      for await (const chunk of stream) {
        if (chunk.type === "TEXT_MESSAGE_START") {
          assistantMessageId = chunk.messageId
        } else if (chunk.type === "TEXT_MESSAGE_CONTENT") {
          firstTokenAt ??= Date.now()
          text += chunk.delta
        } else if (chunk.type === "REASONING_MESSAGE_CONTENT") {
          firstTokenAt ??= Date.now()
          thinking += chunk.delta
        } else if (chunk.type === "RUN_FINISHED") {
          outputTokens = chunk.usage?.completionTokens ?? 0
        } else if (chunk.type === "RUN_ERROR") {
          throw new Error(chunk.message || "Model generation failed")
        }
        yield chunk
      }

      await convex.mutation(api.chatRuns.complete, {
        threadId,
        runId,
        completionSecret,
        assistantMessageId,
        content: text,
        thinking: thinking || undefined,
        generation: generation(),
      })
      finished = true
    } catch (error) {
      if (signal.aborted) {
        await convex.mutation(api.chatRuns.stop, {
          threadId,
          runId,
          completionSecret,
          assistantMessageId,
          content: text,
          thinking: thinking || undefined,
          generation: generation(),
        })
      } else {
        await convex.mutation(api.chatRuns.fail, {
          threadId,
          runId,
          completionSecret,
          assistantMessageId,
          content: text,
          thinking: thinking || undefined,
          generation: generation(),
          errorMessage:
            error instanceof Error ? error.message : "Generation failed",
        })
      }
      finished = true
      throw error
    } finally {
      if (!finished) {
        await convex.mutation(api.chatRuns.stop, {
          threadId,
          runId,
          completionSecret,
          assistantMessageId,
          content: text,
          thinking: thinking || undefined,
          generation: generation(),
        })
      }
    }
  })()
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const clerkAuth = await auth()
        if (!clerkAuth.userId) return errorResponse("Unauthorized", 401)
        const audience = clerkAuth.sessionClaims.aud
        const usesConvexIntegration =
          audience === "convex" ||
          (Array.isArray(audience) && audience.includes("convex"))
        const token = usesConvexIntegration
          ? await clerkAuth.getToken()
          : await clerkAuth.getToken({ template: "convex" })
        if (!token)
          return errorResponse("Convex authentication is not configured", 401)

        let params: Awaited<ReturnType<typeof chatParamsFromRequest>>
        try {
          params = await chatParamsFromRequest(request)
        } catch (error) {
          return error instanceof Response
            ? error
            : errorResponse("Invalid chat request", 400)
        }

        const modelId = params.forwardedProps.modelId
        const reasoningEffort = params.forwardedProps.reasoningEffort
        if (
          typeof modelId !== "string" ||
          !isReasoningEffort(reasoningEffort)
        ) {
          return errorResponse("Invalid model options", 400)
        }
        const model = resolveChatModel(modelId, reasoningEffort)
        if (!model)
          return errorResponse("Unsupported model or reasoning effort", 400)
        const missingRuntimeKey = getMissingRuntimeKey(model.runtime)
        if (missingRuntimeKey) return errorResponse(missingRuntimeKey, 500)

        const userMessage = latestUserMessage(params.messages)
        if (!userMessage)
          return errorResponse("A user message is required", 400)

        const convexUrl = import.meta.env.VITE_CONVEX_URL
        if (!convexUrl)
          return errorResponse("VITE_CONVEX_URL not configured", 500)
        const convex = new ConvexHttpClient(convexUrl, { auth: token })
        const threadId = params.threadId as Id<"threads">
        const completionSecret = crypto.randomUUID()
        let runAccepted = false

        try {
          const run = await convex.mutation(api.chatRuns.start, {
            threadId,
            runId: params.runId,
            completionSecret,
            userMessageId: userMessage.id,
            content: userMessage.content,
            modelId,
            reasoningEffort,
          })
          if (!run.accepted) {
            return errorResponse("This chat request was already handled", 409)
          }
          runAccepted = true
          const context = await convex.query(api.messages.getContext, {
            threadId,
          })
          const abortController = new AbortController()
          request.signal.addEventListener(
            "abort",
            () => abortController.abort(),
            {
              once: true,
            }
          )
          const startedAt = Date.now()
          const stream = streamChatModel({
            runtime: model.runtime,
            messages: contextToModelMessages(context),
            providerReasoningEffort: model.providerReasoningEffort,
            abortController,
          })

          return toServerSentEventsResponse(
            collectAndPersistStream({
              stream,
              convex,
              threadId,
              runId: params.runId,
              completionSecret,
              modelId,
              modelName: modelNames.get(model.id) ?? model.id,
              reasoningEffort,
              startedAt,
              signal: abortController.signal,
            }),
            {
              abortController,
              headers: {
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",
                "X-Content-Type-Options": "nosniff",
              },
            }
          )
        } catch (error) {
          if (runAccepted) {
            await convex
              .mutation(api.chatRuns.fail, {
                threadId,
                runId: params.runId,
                completionSecret,
                content: "",
                errorMessage:
                  error instanceof Error
                    ? error.message
                    : "Unable to start generation",
              })
              .catch(() => undefined)
          }
          return errorResponse(
            error instanceof Error ? error.message : "Unable to start chat",
            400
          )
        }
      },
    },
  },
})
