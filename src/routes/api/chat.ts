import { chatParamsFromRequest, toServerSentEventsResponse } from "@tanstack/ai"
import { auth } from "@clerk/tanstack-react-start/server"
import { createFileRoute } from "@tanstack/react-router"
import { ConvexHttpClient } from "convex/browser"

import { api } from "../../../convex/_generated/api"
import { asThreadId } from "@/lib/convex-ids"
import {
  getChatModelById,
  isReasoningEffort,
  resolveChatModel,
} from "@/lib/chat-models"
import { isJsonString, type JsonValue } from "@/lib/json-value"
import {
  contextRequiresPdf,
  contextRequiresVision,
  contextToModelMessages,
  requestMessagesToContext,
  type ChatContextAttachment,
  type ChatContextMessage,
} from "@/lib/chat-context"
import {
  chatMessageText,
  chatRequestThinking,
  latestUserChatMessage,
  parseAttachmentIds,
  parseMessageAttachmentMap,
} from "@/lib/chat-messages"
import {
  getMissingRuntimeKey,
  streamChatModel,
} from "@/lib/server/chat-model-executors.server"
import { collectAndPersistStream } from "@/lib/server/chat-run-persistence.server"

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

const STREAM_HEADERS = {
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
  "X-Content-Type-Options": "nosniff",
} as const

function assertModelSupportsAttachments(
  context: ChatContextMessage[],
  capabilities: readonly string[]
) {
  if (contextRequiresVision(context) && !capabilities.includes("vision")) {
    throw new Error("This model does not support image attachments")
  }
  if (contextRequiresPdf(context) && !capabilities.includes("pdf")) {
    throw new Error("This model does not support PDF attachments")
  }
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

        // SAFETY: TanStack forwardedProps is an untyped JSON bag from the client.
        const forwarded = params.forwardedProps as {
          modelId?: JsonValue
          reasoningEffort?: JsonValue
          attachmentIds?: JsonValue
          attachmentsByMessageId?: JsonValue
          ephemeral?: JsonValue
        }
        const modelId = forwarded.modelId
        const reasoningEffort = forwarded.reasoningEffort
        if (
          modelId === undefined ||
          reasoningEffort === undefined ||
          !isJsonString(modelId) ||
          !isJsonString(reasoningEffort) ||
          !isReasoningEffort(reasoningEffort)
        ) {
          return errorResponse("Invalid model options", 400)
        }
        const model = resolveChatModel(modelId, reasoningEffort)
        if (!model)
          return errorResponse("Unsupported model or reasoning effort", 400)
        const missingRuntimeKey = getMissingRuntimeKey(model.runtime)
        if (missingRuntimeKey) return errorResponse(missingRuntimeKey, 500)

        let attachmentIds: string[]
        try {
          attachmentIds = parseAttachmentIds(forwarded.attachmentIds)
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : "Invalid attachments",
            400
          )
        }

        const userMessage = latestUserChatMessage(params.messages)
        if (!userMessage) {
          return errorResponse("A user message is required", 400)
        }
        if (!userMessage.content && attachmentIds.length === 0) {
          return errorResponse("Message cannot be empty", 400)
        }

        const convexUrl = import.meta.env.VITE_CONVEX_URL
        if (!convexUrl)
          return errorResponse("VITE_CONVEX_URL not configured", 500)
        const convex = new ConvexHttpClient(convexUrl, { auth: token })
        const catalogModel = getChatModelById(model.id)
        const capabilities = catalogModel?.capabilities ?? []
        const isEphemeral = forwarded.ephemeral === true
        const abortController = new AbortController()
        request.signal.addEventListener(
          "abort",
          () => abortController.abort(),
          {
            once: true,
          }
        )

        if (isEphemeral) {
          try {
            let attachmentsByMessageId: { [messageId: string]: string[] }
            try {
              attachmentsByMessageId = parseMessageAttachmentMap(
                forwarded.attachmentsByMessageId
              )
            } catch (error) {
              return errorResponse(
                error instanceof Error ? error.message : "Invalid attachments",
                400
              )
            }
            if (
              attachmentIds.length > 0 &&
              attachmentsByMessageId[userMessage.id] === undefined
            ) {
              attachmentsByMessageId[userMessage.id] = attachmentIds
            }

            const contextAttachmentIds = [
              ...new Set(Object.values(attachmentsByMessageId).flat()),
            ]
            const signedDownloads =
              contextAttachmentIds.length > 0
                ? await convex.action(api.r2.mintOwnedModelDownloadUrls, {
                    attachmentIds: contextAttachmentIds,
                  })
                : []
            const mintedById = new Map(
              signedDownloads.map((entry: (typeof signedDownloads)[number]) => [
                entry.attachmentId,
                entry,
              ])
            )
            const contextAttachments: Record<string, ChatContextAttachment[]> =
              {}
            for (const [messageId, ids] of Object.entries(
              attachmentsByMessageId
            )) {
              contextAttachments[messageId] = ids.flatMap((id) => {
                const minted = mintedById.get(id)
                if (!minted) return []
                return [
                  {
                    attachmentId: minted.attachmentId,
                    kind: minted.kind,
                    mimeType: minted.mimeType,
                    filename: minted.filename,
                    sizeBytes: minted.sizeBytes,
                    url: minted.url,
                  },
                ]
              })
            }

            const context = requestMessagesToContext(
              params.messages.map((message) => ({
                role: message.role,
                id: "id" in message ? message.id : undefined,
                content: chatMessageText(message),
                thinking: chatRequestThinking(message),
              })),
              contextAttachments
            )
            assertModelSupportsAttachments(context, capabilities)

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
                modelId,
                modelName: catalogModel?.name ?? model.id,
                reasoningEffort,
                startedAt,
                signal: abortController.signal,
                persist: false,
              }),
              {
                abortController,
                headers: STREAM_HEADERS,
              }
            )
          } catch (error) {
            return errorResponse(
              error instanceof Error ? error.message : "Unable to start chat",
              400
            )
          }
        }

        const threadId = asThreadId(params.threadId)
        const completionSecret = crypto.randomUUID()
        let runAccepted = false

        try {
          const run = await convex.mutation(api.chatRuns.start, {
            threadId,
            runId: params.runId,
            completionSecret,
            userMessageId: userMessage.id,
            content: userMessage.content,
            attachmentIds,
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
          const messagesWithUrls: ChatContextMessage[] = context.map(
            (message: (typeof context)[number]) => ({
              role: message.role,
              content: message.content,
              thinking: message.thinking,
              attachments: message.attachments.map((attachment) => ({
                attachmentId: attachment.attachmentId,
                kind: attachment.kind,
                mimeType: attachment.mimeType,
                filename: attachment.filename,
                sizeBytes: attachment.sizeBytes,
              })),
            })
          )
          assertModelSupportsAttachments(messagesWithUrls, capabilities)

          const contextAttachmentIds = [
            ...new Set(
              context.flatMap((message: (typeof context)[number]) =>
                message.attachments.map((attachment) => attachment.attachmentId)
              )
            ),
          ]
          const signedDownloads =
            contextAttachmentIds.length > 0
              ? await convex.action(api.r2.mintModelDownloadUrls, {
                  threadId,
                  attachmentIds: contextAttachmentIds,
                })
              : []
          const urlByAttachmentId = new Map(
            signedDownloads.map((entry: (typeof signedDownloads)[number]) => [
              entry.attachmentId,
              entry.url,
            ])
          )

          const messagesForModel: ChatContextMessage[] = messagesWithUrls.map(
            (message) => ({
              ...message,
              attachments: (message.attachments ?? []).map((attachment) => ({
                ...attachment,
                url: urlByAttachmentId.get(attachment.attachmentId),
              })),
            })
          )

          const startedAt = Date.now()
          const stream = streamChatModel({
            runtime: model.runtime,
            messages: contextToModelMessages(messagesForModel),
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
              modelName: catalogModel?.name ?? model.id,
              reasoningEffort,
              startedAt,
              signal: abortController.signal,
            }),
            {
              abortController,
              headers: STREAM_HEADERS,
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
