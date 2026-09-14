import { useMemo } from "react"
import { useConvexAuth, useQuery } from "convex/react"

import { api } from "../../convex/_generated/api"
import { useChatRouteState } from "@/hooks/useChatRouteState"
import { useActiveThread } from "@/hooks/useActiveThread"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useThreadComposerDraft } from "@/hooks/useThreadComposerState"
import {
  estimateThreadInputTokens,
  modelInputBudget,
} from "@/lib/attachment-context"
import { isExtractedTextKind } from "@/lib/attachment-limits"
import { asThreadId } from "@/lib/convex-ids"
import {
  contextFillRatio,
  contextTokensUsed,
  estimateThreadCostUsd,
  estimateTurnCostUsd,
  formatContextUsage,
  formatTokenCount,
  formatUsd,
  hydrateThreadGenerationUsage,
  isLongChatDanger,
  LONG_CHAT_DANGER,
  usageRatesFor,
} from "@/lib/generation-usage"
import { getChatModelById } from "@/lib/chat-models"
import { isTemporaryThreadId } from "@/lib/temporary-chat"
import { chatMessageText, chatMessageThinking } from "@/lib/threads"
import type { AssistantGenerationStats } from "@/lib/threads"
import { useChatRuntimeStore } from "@/stores/chat-runtime-store"
import { useTemporaryThreadsStore } from "@/stores/temporary-threads-store"

export type ComposerUsageStripData = {
  costLabel?: string
  lastTurnCostLabel?: string
  cacheReadEstimated: boolean
  contextLabel?: string
  contextFill?: number
  inputTokensLabel?: string
  outputTokensLabel?: string
  cacheHitsLabel?: string
  cacheWritesLabel?: string
  tokensEstimated: boolean
  longChat: boolean
}

export function useComposerUsage(threadStateKey: string) {
  const { threadId, isTemporary, isDraft } = useChatRouteState()
  const { isAuthenticated } = useConvexAuth()
  const { selectedModelId } = useModelPreferences()
  const draft = useThreadComposerDraft(threadStateKey)
  const { activeThread } = useActiveThread(
    isTemporary || isDraft ? undefined : threadId
  )
  const storedTemporary = useTemporaryThreadsStore(
    (state) => state.threads[threadId]
  )
  const isTurnInFlight = useChatRuntimeStore(
    (state) => state.isLoading || state.activeTurn
  )
  const persistableThreadId =
    isAuthenticated &&
    !isDraft &&
    !isTemporary &&
    threadId !== "guest" &&
    !isTemporaryThreadId(threadId)
      ? asThreadId(threadId)
      : null
  const threadAttachmentDocs = useQuery(
    api.attachments.listForThreadMessages,
    persistableThreadId ? { threadId: persistableThreadId } : "skip"
  )

  const catalog = getChatModelById(selectedModelId)
  const inputBudget = modelInputBudget({
    contextTokens: catalog?.contextTokens ?? null,
    outputTokens: catalog?.outputTokens ?? null,
  })
  const modelName = catalog?.name ?? selectedModelId

  const generationStats: Record<string, AssistantGenerationStats> =
    isTemporary
      ? (storedTemporary?.generationStats ?? {})
      : (activeThread?.generationStats ?? {})
  const messages = isTemporary
    ? storedTemporary
      ? storedTemporary.messages.map((message) => ({
          id: message.messageId,
          content: message.content ?? "",
          thinking: message.thinking ?? "",
        }))
      : []
    : (activeThread?.messages ?? []).map((message) => ({
        id: message.id,
        content: chatMessageText(message),
        thinking: chatMessageThinking(message),
      }))

  const hydrated = hydrateThreadGenerationUsage(messages, generationStats)
  const usages = hydrated.usages.map((usage) => ({
    ...usage,
    modelId: usage.modelId ?? selectedModelId,
  }))
  const lastTurn = lastCompletedUsage(usages)
  const lastPromptTokens = hydrated.lastPromptTokens
  const contextUsed =
    lastTurn?.promptTokens != null
      ? contextTokensUsed(lastTurn.promptTokens, lastTurn.outputTokens)
      : lastPromptTokens
  const historicalDocxEstimates = (threadAttachmentDocs ?? [])
    .filter((attachment) => isExtractedTextKind(attachment.kind))
    .map((attachment) => attachment.extractedTokenEstimate ?? 0)

  const threadTokensWithoutComposerDocx = estimateThreadInputTokens({
    lastPromptTokens: contextUsed,
    messageTexts: messages.map(
      (message) => `${message.content}${message.thinking}`
    ),
    readyDocxEstimates: contextUsed ? [] : historicalDocxEstimates,
    draft,
  })

  const contextGate = useMemo(
    () => ({
      threadTokensWithoutComposerDocx,
      inputBudget,
      modelName,
    }),
    [inputBudget, modelName, threadTokensWithoutComposerDocx]
  )

  const threadCost = estimateThreadCostUsd(usages)
  const lastTurnCost = lastTurn ? estimateTurnCostUsd(lastTurn) : null
  const rates = lastTurn ? usageRatesFor(lastTurn) : null
  const contextWindow = catalog?.contextTokens ?? null
  const contextLabel =
    contextUsed != null
      ? (formatContextUsage(contextUsed, contextWindow) ?? undefined)
      : undefined
  const contextFill =
    contextFillRatio(contextUsed, contextWindow) ?? undefined

  const usage: ComposerUsageStripData = {
    costLabel: threadCost != null ? formatUsd(threadCost) : undefined,
    lastTurnCostLabel:
      lastTurnCost != null ? formatUsd(lastTurnCost) : undefined,
    cacheReadEstimated: rates?.cacheReadEstimated ?? true,
    contextLabel: contextLabel ?? undefined,
    contextFill,
    inputTokensLabel:
      lastTurn?.promptTokens != null
        ? formatTokenCount(lastTurn.promptTokens)
        : undefined,
    outputTokensLabel:
      lastTurn != null && lastTurn.outputTokens > 0
        ? formatTokenCount(lastTurn.outputTokens)
        : undefined,
    cacheHitsLabel:
      lastTurn?.cachedTokens && lastTurn.cachedTokens > 0
        ? formatTokenCount(lastTurn.cachedTokens)
        : undefined,
    cacheWritesLabel:
      lastTurn?.cacheWriteTokens && lastTurn.cacheWriteTokens > 0
        ? formatTokenCount(lastTurn.cacheWriteTokens)
        : undefined,
    tokensEstimated: hydrated.tokensEstimated,
    longChat: isLongChatDanger(contextUsed, contextWindow, LONG_CHAT_DANGER),
  }

  return {
    usage: isTurnInFlight ? undefined : usage,
    contextGate,
    selectedModelId,
  }
}

function lastCompletedUsage(
  usages: AssistantGenerationStats[]
): AssistantGenerationStats | undefined {
  for (let index = usages.length - 1; index >= 0; index--) {
    const entry = usages[index]
    if (entry?.promptTokens != null) return entry
  }
  return usages.at(-1)
}
