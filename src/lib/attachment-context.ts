import { MAX_MODEL_OUTPUT_TOKENS } from "@/lib/chat-models"
import { estimateTextTokens } from "@/lib/token-estimate"

export const ATTACHMENT_CONTEXT_WARN_RATIO = 0.5

export const ATTACHMENT_CONTEXT_COPY = {
  tooLarge: (modelName: string, fileTokens: number, budget: number) =>
    `This file is too large for ${modelName}. About ${fileTokens.toLocaleString()} tokens, limit ${budget.toLocaleString()}.`,
  noRoom: (modelName: string, fileTokens: number, leftover: number) =>
    `This file needs about ${fileTokens.toLocaleString()} tokens. ${modelName} has about ${leftover.toLocaleString()} tokens left.`,
  warn: (percent: number) =>
    `This file uses about ${percent}% of the remaining context`,
} as const

export function modelInputBudget(model: {
  contextTokens: number | null
  outputTokens: number | null
}): number | null {
  if (model.contextTokens == null || model.contextTokens <= 0) return null
  const reservedOutput = Math.min(
    model.outputTokens ?? MAX_MODEL_OUTPUT_TOKENS,
    MAX_MODEL_OUTPUT_TOKENS
  )
  return Math.max(0, model.contextTokens - reservedOutput)
}

export function estimateThreadInputTokens(input: {
  lastPromptTokens?: number
  messageTexts?: ReadonlyArray<string>
  readyDocxEstimates?: ReadonlyArray<number>
  draft?: string
}): number {
  if (
    input.lastPromptTokens != null &&
    Number.isFinite(input.lastPromptTokens) &&
    input.lastPromptTokens > 0
  ) {
    return Math.ceil(input.lastPromptTokens) + estimateTextTokens(input.draft ?? "")
  }

  const messageTokens = (input.messageTexts ?? []).reduce(
    (sum, text) => sum + estimateTextTokens(text),
    0
  )
  return (
    messageTokens +
    estimateTextTokens(input.draft ?? "") +
    sumEstimates(input.readyDocxEstimates)
  )
}

function sumEstimates(values: ReadonlyArray<number> | undefined) {
  if (!values) return 0
  return values.reduce((sum, value) => sum + Math.max(0, value), 0)
}

export type AttachmentContextVerdict =
  | { status: "ok" }
  | { status: "warn"; message: string }
  | { status: "reject"; message: string }

export function evaluateAttachmentContext(input: {
  fileTokens: number
  threadTokens: number
  inputBudget: number | null
  modelName: string
}): AttachmentContextVerdict {
  const fileTokens = Math.max(0, Math.ceil(input.fileTokens))
  if (input.inputBudget == null) return { status: "ok" }

  const budget = input.inputBudget
  const threadWithoutFile = Math.max(0, input.threadTokens - fileTokens)

  if (fileTokens > budget) {
    return {
      status: "reject",
      message: ATTACHMENT_CONTEXT_COPY.tooLarge(
        input.modelName,
        fileTokens,
        budget
      ),
    }
  }

  const leftover = Math.max(0, budget - threadWithoutFile)
  if (fileTokens > leftover) {
    return {
      status: "reject",
      message: ATTACHMENT_CONTEXT_COPY.noRoom(
        input.modelName,
        fileTokens,
        leftover
      ),
    }
  }

  if (leftover > 0 && fileTokens / leftover >= ATTACHMENT_CONTEXT_WARN_RATIO) {
    const percent = Math.round((fileTokens / leftover) * 100)
    return {
      status: "warn",
      message: ATTACHMENT_CONTEXT_COPY.warn(percent),
    }
  }

  return { status: "ok" }
}

type ComposerGateAttachment = {
  kind: string
  status: string
  extractedTokenEstimate?: number
  errorMessage?: string
  contextWarning?: string
}

export function applyComposerContextGate<T extends ComposerGateAttachment>(
  attachments: T[],
  input: {
    threadTokensWithoutComposerDocx: number
    inputBudget: number | null
    modelName: string
  }
): T[] {
  const composerDocxTokens = attachments.reduce((sum, attachment) => {
    if (attachment.kind !== "docx") return sum
    if (attachment.status !== "ready" && attachment.status !== "failed") {
      return sum
    }
    return sum + (attachment.extractedTokenEstimate ?? 0)
  }, 0)

  return attachments.map((attachment) => {
    if (
      attachment.kind !== "docx" ||
      attachment.extractedTokenEstimate == null ||
      (attachment.status !== "ready" && attachment.status !== "failed")
    ) {
      return attachment
    }

    const verdict = evaluateAttachmentContext({
      fileTokens: attachment.extractedTokenEstimate,
      threadTokens: input.threadTokensWithoutComposerDocx + composerDocxTokens,
      inputBudget: input.inputBudget,
      modelName: input.modelName,
    })

    if (verdict.status === "reject") {
      return {
        ...attachment,
        status: "failed",
        errorMessage: verdict.message,
        contextWarning: undefined,
      }
    }
    if (verdict.status === "warn") {
      return {
        ...attachment,
        status: "ready",
        errorMessage: undefined,
        contextWarning: verdict.message,
      }
    }
    return {
      ...attachment,
      status: "ready",
      errorMessage: undefined,
      contextWarning: undefined,
    }
  })
}

export function attachmentContextRejection(input: {
  fileTokenEstimates: ReadonlyArray<number>
  threadTokensWithoutFiles: number
  inputBudget: number | null
  modelName: string
}): string | null {
  if (input.inputBudget == null) return null
  const filesTotal = sumEstimates(input.fileTokenEstimates)
  const threadTokens = input.threadTokensWithoutFiles + filesTotal
  for (const fileTokens of input.fileTokenEstimates) {
    const verdict = evaluateAttachmentContext({
      fileTokens,
      threadTokens,
      inputBudget: input.inputBudget,
      modelName: input.modelName,
    })
    if (verdict.status === "reject") return verdict.message
  }
  return null
}

export function contextAttachmentRejection(
  messages: Array<{
    role: "user" | "assistant"
    content: string
    thinking?: string
    promptTokens?: number
    attachments?: Array<{
      kind: string
      extractedTokenEstimate?: number
    }>
  }>,
  model: {
    name: string
    contextTokens: number | null
    outputTokens: number | null
  }
): string | null {
  const inputBudget = modelInputBudget(model)
  const lastUser = [...messages]
    .reverse()
    .find((message) => message.role === "user")
  const currentFileTokens = (lastUser?.attachments ?? [])
    .filter((attachment) => attachment.kind === "docx")
    .map((attachment) => attachment.extractedTokenEstimate ?? 0)
  if (currentFileTokens.length === 0) return null

  const lastPromptTokens = [...messages]
    .reverse()
    .find((message) => message.promptTokens != null)?.promptTokens
  const historicalDocx = messages
    .filter((message) => message !== lastUser)
    .flatMap((message) =>
      (message.attachments ?? [])
        .filter((attachment) => attachment.kind === "docx")
        .map((attachment) => attachment.extractedTokenEstimate ?? 0)
    )

  const threadTokensWithoutFiles = estimateThreadInputTokens({
    lastPromptTokens,
    messageTexts: lastPromptTokens
      ? []
      : messages.map(
          (message) => `${message.content}${message.thinking ?? ""}`
        ),
    draft: lastPromptTokens ? (lastUser?.content ?? "") : "",
    readyDocxEstimates: lastPromptTokens ? [] : historicalDocx,
  })

  return attachmentContextRejection({
    fileTokenEstimates: currentFileTokens,
    threadTokensWithoutFiles,
    inputBudget,
    modelName: model.name,
  })
}
