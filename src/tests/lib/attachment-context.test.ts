import { describe, expect, it } from "vitest"

import {
  applyComposerContextGate,
  attachmentContextRejection,
  contextAttachmentRejection,
  estimateThreadInputTokens,
  evaluateAttachmentContext,
  modelInputBudget,
} from "@/lib/attachment-context"
import { MAX_MODEL_OUTPUT_TOKENS } from "@/lib/chat-models"

describe("modelInputBudget", () => {
  it("reserves output tokens from the context window", () => {
    expect(
      modelInputBudget({
        contextTokens: 100_000,
        outputTokens: 8_000,
      })
    ).toBe(92_000)
  })

  it("caps reserved output at the app max", () => {
    expect(
      modelInputBudget({
        contextTokens: 100_000,
        outputTokens: MAX_MODEL_OUTPUT_TOKENS * 2,
      })
    ).toBe(100_000 - MAX_MODEL_OUTPUT_TOKENS)
  })

  it("skips a hard budget when the window is unknown", () => {
    expect(
      modelInputBudget({ contextTokens: null, outputTokens: 1000 })
    ).toBeNull()
  })
})

describe("estimateThreadInputTokens", () => {
  it("prefers last prompt tokens and ignores historical Word estimates", () => {
    expect(
      estimateThreadInputTokens({
        lastPromptTokens: 1_000,
        draft: "abcd",
        readyDocxEstimates: [50_000],
        messageTexts: ["ignored"],
      })
    ).toBe(1_001)
  })
})

describe("evaluateAttachmentContext", () => {
  it("rejects a file over the input budget", () => {
    const verdict = evaluateAttachmentContext({
      fileTokens: 20_000,
      threadTokens: 20_000,
      inputBudget: 10_000,
      modelName: "Fast model",
    })
    expect(verdict.status).toBe("reject")
    if (verdict.status === "reject") {
      expect(verdict.message).toContain("too large for Fast model")
      expect(verdict.message).toContain("20,000")
      expect(verdict.message).toContain("10,000")
    }
  })

  it("rejects when file plus history will not fit", () => {
    const verdict = evaluateAttachmentContext({
      fileTokens: 4_000,
      threadTokens: 12_000,
      inputBudget: 10_000,
      modelName: "Fast model",
    })
    expect(verdict.status).toBe("reject")
    if (verdict.status === "reject") {
      expect(verdict.message).toContain("tokens left")
    }
  })

  it("is ok when the file is under half of the leftover room", () => {
    expect(
      evaluateAttachmentContext({
        fileTokens: 1_000,
        threadTokens: 3_000,
        inputBudget: 10_000,
        modelName: "GPT-5.5",
      })
    ).toEqual({ status: "ok" })
  })

  it("warns when the file uses at least half of the leftover room", () => {
    const verdict = evaluateAttachmentContext({
      fileTokens: 4_000,
      threadTokens: 6_000,
      inputBudget: 10_000,
      modelName: "GPT-5.5",
    })
    expect(verdict).toEqual({
      status: "warn",
      message: "This file uses about 50% of the remaining context",
    })
  })

  it("skips reject when the window is unknown", () => {
    expect(
      evaluateAttachmentContext({
        fileTokens: 999_999,
        threadTokens: 999_999,
        inputBudget: null,
        modelName: "Mystery",
      })
    ).toEqual({ status: "ok" })
  })
})

describe("applyComposerContextGate", () => {
  it("flips a ready Word chip to failed when the model window shrinks", () => {
    const [next] = applyComposerContextGate(
      [
        {
          kind: "docx",
          status: "ready",
          extractedTokenEstimate: 20_000,
          errorMessage: undefined,
          contextWarning: undefined,
        },
      ],
      {
        threadTokensWithoutComposerDocx: 0,
        inputBudget: 10_000,
        modelName: "Small model",
      }
    )
    expect(next?.status).toBe("failed")
    expect(next?.errorMessage).toContain("too large for Small model")
  })

  it("restores a context-failed chip when the window grows", () => {
    const [next] = applyComposerContextGate(
      [
        {
          kind: "docx",
          status: "failed",
          extractedTokenEstimate: 2_000,
          errorMessage: "This file is too large for Small model. About 2,000 tokens, limit 1,000.",
        },
      ],
      {
        threadTokensWithoutComposerDocx: 0,
        inputBudget: 100_000,
        modelName: "GPT-5.5",
      }
    )
    expect(next?.status).toBe("ready")
    expect(next?.errorMessage).toBeUndefined()
  })
})

describe("attachmentContextRejection", () => {
  it("returns copy the chat API can send as 400", () => {
    expect(
      attachmentContextRejection({
        fileTokenEstimates: [50_000],
        threadTokensWithoutFiles: 0,
        inputBudget: 10_000,
        modelName: "Fast model",
      })
    ).toContain("too large for Fast model")
  })
})

describe("contextAttachmentRejection", () => {
  it("rejects an oversized extract on the request path", () => {
    expect(
      contextAttachmentRejection(
        [
          {
            role: "user",
            content: "Summarize this",
            attachments: [
              { kind: "docx", extractedTokenEstimate: 80_000 },
            ],
          },
        ],
        {
          name: "Fast model",
          contextTokens: 20_000,
          outputTokens: 4_000,
        }
      )
    ).toContain("too large")
  })

  it("ignores docx when the selected model has no known window", () => {
    expect(
      contextAttachmentRejection(
        [
          {
            role: "user",
            content: "hi",
            attachments: [{ kind: "docx", extractedTokenEstimate: 80_000 }],
          },
        ],
        {
          name: "Mystery",
          contextTokens: null,
          outputTokens: null,
        }
      )
    ).toBeNull()
  })
})
