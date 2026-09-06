import { Migrations } from "@convex-dev/migrations"

import { components } from "./_generated/api"
import { MAX_MODEL_CONTEXT_MESSAGES } from "./constants"
import { getMessageContent, getMessageThinking } from "./helpers/messages"
import { getChatModelById } from "../src/lib/chat-models"
import { estimateTextTokens } from "../src/lib/token-estimate"
import type { DataModel } from "./_generated/dataModel"

function catalogRates(modelId: string) {
  const model = getChatModelById(modelId)
  if (
    !model ||
    model.inputCostPerMillion == null ||
    model.outputCostPerMillion == null
  ) {
    return null
  }
  return {
    inputCostPerMillion: model.inputCostPerMillion,
    outputCostPerMillion: model.outputCostPerMillion,
    cacheReadCostPerMillion: model.inputCostPerMillion / 2,
    cacheReadEstimated: true,
  }
}

export const migrations = new Migrations<DataModel>(components.migrations)

export const messagesToPlainText = migrations.define({
  table: "messages",
  migrateOne: (_ctx, message) => ({
    content: getMessageContent(message),
    thinking: getMessageThinking(message) || undefined,
    parts: undefined,
  }),
})

export const backfillGenerationUsage = migrations.define({
  table: "messages",
  migrateOne: async (ctx, message) => {
    if (message.role !== "assistant" || !message.generation) return
    const generation = message.generation
    const needsPrompt =
      generation.promptTokens == null ||
      generation.promptTokensEstimated === true
    const needsRates = generation.inputCostPerMillion == null
    if (!needsPrompt && !needsRates) return

    const rates = needsRates ? catalogRates(generation.modelId) : null
    let promptTokens = generation.promptTokens
    if (needsPrompt) {
      const prior = await ctx.db
        .query("messages")
        .withIndex("by_threadId_and_sequence", (query) =>
          query
            .eq("threadId", message.threadId)
            .lt("sequence", message.sequence)
        )
        .order("desc")
        .take(MAX_MODEL_CONTEXT_MESSAGES)
      promptTokens = prior.reduce(
        (sum, entry) =>
          sum +
          estimateTextTokens(
            `${getMessageContent(entry)}${getMessageThinking(entry)}`
          ),
        0
      )
    }

    return {
      generation: {
        ...generation,
        ...(needsPrompt
          ? { promptTokens, promptTokensEstimated: true }
          : {}),
        ...(rates
          ? {
              inputCostPerMillion: rates.inputCostPerMillion,
              outputCostPerMillion: rates.outputCostPerMillion,
              cacheReadCostPerMillion: rates.cacheReadCostPerMillion,
              cacheReadEstimated: rates.cacheReadEstimated,
            }
          : {}),
      },
    }
  },
})
