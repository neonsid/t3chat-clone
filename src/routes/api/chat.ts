import { chatParamsFromRequest, toServerSentEventsResponse } from "@tanstack/ai"
import { auth } from "@clerk/tanstack-react-start/server"
import { createFileRoute } from "@tanstack/react-router"
import { ConvexHttpClient } from "convex/browser"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  getChatModelById,
  isReasoningEffort,
  resolveChatModel,
} from "@/lib/chat-models"
import { contextToModelMessages } from "@/lib/chat-context"
import { latestUserChatMessage } from "@/lib/chat-messages"
import {
  getMissingRuntimeKey,
  streamChatModel,
} from "@/lib/server/chat-model-executors.server"
import { collectAndPersistStream } from "@/lib/server/chat-run-persistence.server"

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
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

        const userMessage = latestUserChatMessage(params.messages)
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
              modelName: getChatModelById(model.id)?.name ?? model.id,
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
