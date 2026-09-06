import { describe, expect, it } from "vitest"

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
} from "@/lib/generation-usage"

const rates = {
  inputCostPerMillion: 5,
  outputCostPerMillion: 30,
  cacheReadCostPerMillion: 2.5,
  cacheReadEstimated: true,
}

describe("estimateTurnCostUsd", () => {
  it("prices uncached prompt plus output", () => {
    expect(
      estimateTurnCostUsd(
        {
          modelId: "openai/gpt-5.5",
          promptTokens: 1_000_000,
          outputTokens: 1_000_000,
        },
        rates
      )
    ).toBe(35)
  })

  it("discounts cached prompt tokens at the cache-read rate", () => {
    expect(
      estimateTurnCostUsd(
        {
          modelId: "openai/gpt-5.5",
          promptTokens: 1_000_000,
          cachedTokens: 400_000,
          outputTokens: 0,
        },
        rates
      )
    ).toBe(4)
  })

  it("returns no dollar figure when prompt tokens are missing", () => {
    expect(
      estimateTurnCostUsd(
        { modelId: "openai/gpt-5.5", outputTokens: 100 },
        rates
      )
    ).toBeNull()
  })

  it("returns no dollar figure when rates are missing", () => {
    expect(
      estimateTurnCostUsd({
        modelId: "unknown/model",
        promptTokens: 100,
        outputTokens: 10,
      })
    ).toBeNull()
  })

  it("uses stored rates when the catalog no longer has the model", () => {
    expect(
      estimateTurnCostUsd({
        modelId: "retired/model",
        promptTokens: 1_000_000,
        cachedTokens: 400_000,
        outputTokens: 0,
        inputCostPerMillion: 5,
        outputCostPerMillion: 30,
        cacheReadCostPerMillion: 2.5,
      })
    ).toBe(4)
  })
})

describe("estimateThreadCostUsd", () => {
  it("sums turns that have prompt tokens and skips the rest", () => {
    expect(
      estimateThreadCostUsd([
        {
          modelId: "openai/gpt-5.5",
          promptTokens: 1_000_000,
          outputTokens: 0,
        },
        { modelId: "openai/gpt-5.5", outputTokens: 50 },
      ])
    ).toBe(
      estimateTurnCostUsd({
        modelId: "openai/gpt-5.5",
        promptTokens: 1_000_000,
        outputTokens: 0,
      })
    )
  })
})

describe("hydrateThreadGenerationUsage", () => {
  it("fills missing prompt tokens from earlier message text", () => {
    const hydrated = hydrateThreadGenerationUsage(
      [
        { id: "u1", content: "abcd" },
        { id: "a1", content: "reply" },
      ],
      {
        a1: {
          modelId: "openai/gpt-5.5",
          outputTokens: 10,
        },
      }
    )
    expect(hydrated.lastPromptTokens).toBe(1)
    expect(hydrated.tokensEstimated).toBe(true)
    expect(hydrated.usages[0]?.promptTokens).toBe(1)
    expect(estimateThreadCostUsd(hydrated.usages)).not.toBeNull()
  })

  it("prices a turn that only stored the model display name", () => {
    const hydrated = hydrateThreadGenerationUsage(
      [
        { id: "u1", content: "abcd" },
        { id: "a1", content: "reply" },
      ],
      {
        a1: {
          modelName: "GPT-5.5",
          outputTokens: 10,
        },
      }
    )
    expect(hydrated.lastPromptTokens).toBe(1)
    expect(estimateThreadCostUsd(hydrated.usages)).not.toBeNull()
  })

  it("estimates context from message length when no generation stats exist", () => {
    const hydrated = hydrateThreadGenerationUsage(
      [
        { id: "u1", content: "abcd" },
        { id: "a1", content: "wxyz" },
      ],
      {}
    )
    expect(hydrated.lastPromptTokens).toBe(2)
    expect(hydrated.tokensEstimated).toBe(true)
    expect(hydrated.usages).toEqual([])
  })

  it("keeps stored prompt tokens and does not mark them estimated", () => {
    const hydrated = hydrateThreadGenerationUsage(
      [
        { id: "u1", content: "abcd" },
        { id: "a1", content: "reply" },
      ],
      {
        a1: {
          modelId: "openai/gpt-5.5",
          promptTokens: 80,
          outputTokens: 10,
        },
      }
    )
    expect(hydrated.lastPromptTokens).toBe(80)
    expect(hydrated.tokensEstimated).toBe(false)
  })
})

describe("usage formatters", () => {
  it("formats compact token counts and a used/window pair", () => {
    expect(formatTokenCount(12_400)).toBe("12.4k")
    expect(formatTokenCount(1_050_000)).toBe("1.05M")
    expect(formatContextUsage(12_400, 1_050_000)).toBe("12.4k / 1.05M")
    expect(formatContextUsage(undefined, 1_050_000)).toBe("1.05M")
    expect(formatUsd(0.012)).toBe("$0.01")
    expect(contextFillRatio(12_400, 1_050_000)).toBeCloseTo(12_400 / 1_050_000)
    expect(contextFillRatio(undefined, 1_050_000)).toBeNull()
    expect(contextTokensUsed(30, 5764)).toBe(5794)
    expect(contextTokensUsed(30, undefined)).toBe(30)
    expect(contextTokensUsed(undefined, 5764)).toBeUndefined()
  })

  it("flags a long chat at 32k tokens or 25% of the window", () => {
    const limits = LONG_CHAT_DANGER
    expect(isLongChatDanger(8_000, 1_050_000, limits)).toBe(false)
    expect(isLongChatDanger(32_000, 1_050_000, limits)).toBe(true)
    expect(isLongChatDanger(4_000, 8_000, limits)).toBe(true)
    expect(isLongChatDanger(undefined, 1_050_000, limits)).toBe(false)
  })
})
