import { getChatModelById, getChatModelByName } from "@/lib/chat-models"
import { estimateTextTokens } from "@/lib/token-estimate"

export type GenerationUsageRates = {
  inputCostPerMillion: number
  outputCostPerMillion: number
  cacheReadCostPerMillion: number
  cacheReadEstimated: boolean
}

export type GenerationUsageInput = {
  modelId?: string
  modelName?: string
  promptTokens?: number
  outputTokens: number
  cachedTokens?: number
  cacheWriteTokens?: number
  inputCostPerMillion?: number
  outputCostPerMillion?: number
  cacheReadCostPerMillion?: number
  cacheReadEstimated?: boolean
  promptTokensEstimated?: boolean
}

export function catalogUsageRates(
  modelId: string | undefined
): GenerationUsageRates | null {
  if (!modelId) return null
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

export function storedUsageRates(
  usage: GenerationUsageInput
): GenerationUsageRates | null {
  if (
    usage.inputCostPerMillion == null ||
    usage.outputCostPerMillion == null
  ) {
    return null
  }

  return {
    inputCostPerMillion: usage.inputCostPerMillion,
    outputCostPerMillion: usage.outputCostPerMillion,
    cacheReadCostPerMillion:
      usage.cacheReadCostPerMillion ?? usage.inputCostPerMillion / 2,
    cacheReadEstimated:
      usage.cacheReadEstimated ?? usage.cacheReadCostPerMillion == null,
  }
}

export function usageRatesFor(
  usage: GenerationUsageInput
): GenerationUsageRates | null {
  return (
    storedUsageRates(usage) ??
    catalogUsageRates(usage.modelId) ??
    catalogUsageRates(getChatModelByName(usage.modelName ?? "")?.id)
  )
}

export function estimateTurnCostUsd(
  usage: GenerationUsageInput,
  rates = usageRatesFor(usage)
): number | null {
  if (!rates) return null
  if (usage.promptTokens == null || usage.promptTokens < 0) return null

  const cached = Math.min(
    Math.max(0, usage.cachedTokens ?? 0),
    usage.promptTokens
  )
  const uncached = usage.promptTokens - cached
  const output = Math.max(0, usage.outputTokens)

  return (
    (uncached * rates.inputCostPerMillion +
      cached * rates.cacheReadCostPerMillion +
      output * rates.outputCostPerMillion) /
    1_000_000
  )
}

export function estimatePromptTokensFromTexts(
  texts: ReadonlyArray<string>
) {
  return texts.reduce((sum, text) => sum + estimateTextTokens(text), 0)
}

export function hydrateThreadGenerationUsage<T extends GenerationUsageInput>(
  messages: ReadonlyArray<{
    id: string
    content: string
    thinking?: string
  }>,
  stats: Record<string, T>
): {
  usages: Array<T & { promptTokens?: number; promptTokensEstimated?: boolean }>
  lastPromptTokens?: number
  tokensEstimated: boolean
} {
  let priorTokens = 0
  const usages: Array<
    T & { promptTokens?: number; promptTokensEstimated?: boolean }
  > = []
  let lastPromptTokens: number | undefined
  let tokensEstimated = false

  for (const message of messages) {
    const textTokens = estimateTextTokens(
      `${message.content}${message.thinking ?? ""}`
    )
    const stat = stats[message.id]
    if (stat) {
      const estimated = stat.promptTokens == null
      const promptTokens = estimated ? priorTokens : stat.promptTokens
      usages.push({
        ...stat,
        promptTokens,
        promptTokensEstimated: stat.promptTokensEstimated ?? estimated,
      })
      if (promptTokens != null && promptTokens > 0) {
        lastPromptTokens = promptTokens
        tokensEstimated =
          tokensEstimated || Boolean(stat.promptTokensEstimated ?? estimated)
      }
    }
    priorTokens += textTokens
  }

  if (lastPromptTokens == null && priorTokens > 0) {
    lastPromptTokens = priorTokens
    tokensEstimated = true
  }

  return { usages, lastPromptTokens, tokensEstimated }
}

export function estimateThreadCostUsd(
  usages: ReadonlyArray<GenerationUsageInput>
): number | null {
  let total = 0
  let counted = 0
  for (const usage of usages) {
    const cost = estimateTurnCostUsd(usage)
    if (cost == null) continue
    total += cost
    counted += 1
  }
  return counted > 0 ? total : null
}

export function formatUsd(amount: number) {
  if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`
  return `$${amount.toFixed(2)}`
}

export function formatTokenCount(tokens: number) {
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000
    return `${trimFloat(millions)}M`
  }
  if (tokens >= 1_000) {
    const thousands = tokens / 1_000
    return `${trimFloat(thousands)}k`
  }
  return tokens.toLocaleString()
}

export function contextTokensUsed(
  promptTokens: number | undefined,
  outputTokens: number | undefined
) {
  if (promptTokens == null) return undefined
  return promptTokens + Math.max(0, outputTokens ?? 0)
}

export function formatContextUsage(
  used: number | undefined,
  window: number | null
) {
  if (window == null || window <= 0) return null
  if (used == null) return formatTokenCount(window)
  return `${formatTokenCount(used)} / ${formatTokenCount(window)}`
}

export function contextFillRatio(
  used: number | undefined,
  window: number | null
) {
  if (used == null || window == null || window <= 0) return null
  return Math.min(1, Math.max(0, used / window))
}

export const LONG_CHAT_DANGER = {
  tokens: 32_000,
  ratio: 0.25,
} as const

export function isLongChatDanger(
  used: number | undefined,
  window: number | null,
  limits: { tokens: number; ratio: number }
) {
  if (used == null || used <= 0) return false
  if (used >= limits.tokens) return true
  if (window == null || window <= 0) return false
  return used / window >= limits.ratio
}

function trimFloat(value: number) {
  return value
    .toFixed(value >= 10 ? 1 : 2)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1")
}
