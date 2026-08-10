import { describe, expect, it } from "vitest"

import { enrichOpenRouterReasoningChunk } from "@/lib/server/openrouter-reasoning"

function chunkWithDelta(delta: {
  reasoning?: string
  reasoningDetails?: Array<{
    type: string
    text?: string
    summary?: string
  }>
}) {
  return {
    id: "chunk-1",
    choices: [{ index: 0, delta }],
  }
}

describe("enrichOpenRouterReasoningChunk", () => {
  it("promotes delta.reasoning into reasoningDetails when details are missing", () => {
    const enriched = enrichOpenRouterReasoningChunk(
      chunkWithDelta({ reasoning: "Full chain of thought…" })
    )

    expect(enriched.choices[0]?.delta?.reasoningDetails).toEqual([
      { type: "reasoning.text", text: "Full chain of thought…" },
    ])
  })

  it("prefers longer delta.reasoning over a short reasoningDetails summary", () => {
    const enriched = enrichOpenRouterReasoningChunk(
      chunkWithDelta({
        reasoning: "The question is about cache lines. A cache line is…",
        reasoningDetails: [
          { type: "reasoning.summary", summary: "Brief answer." },
        ],
      })
    )

    expect(enriched.choices[0]?.delta?.reasoningDetails).toEqual([
      {
        type: "reasoning.text",
        text: "The question is about cache lines. A cache line is…",
      },
    ])
  })

  it("keeps richer reasoningDetails when they are already longer", () => {
    const details = [
      {
        type: "reasoning.text",
        text: "Long structured reasoning already present in details.",
      },
    ]
    const enriched = enrichOpenRouterReasoningChunk(
      chunkWithDelta({
        reasoning: "short",
        reasoningDetails: details,
      })
    )

    expect(enriched.choices[0]?.delta?.reasoningDetails).toEqual(details)
  })
})
