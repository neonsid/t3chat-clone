export const CHAT_COMPOSER_PLACEHOLDERS = {
  newThread: "Type your message here...",
  followUp: "Ask for follow-up changes...",
  loadingConversation: "Loading conversation...",
} as const

export const COMPOSER_STREAM_ERROR = {
  saveFailed: "Couldn't save this reply. Try sending again.",
} as const

/** Published on [data-chat-shell] by ChatShellComposer; thread view reads via CSS. */
export const CHAT_COMPOSER_OVERLAY_HEIGHT = {
  cssVar: "--chat-composer-overlay-height",
  fallbackPx: 148,
  threadInsetPx: 16,
} as const

export const REASONING_EFFORTS = [
  {
    value: "instant",
    label: "Instant",
    iconSrc: null,
  },
  {
    value: "low",
    label: "Low",
    iconSrc: "/BrainIconLow.svg",
  },
  {
    value: "medium",
    label: "Medium",
    iconSrc: "/BrainIconMedium.svg",
  },
  {
    value: "high",
    label: "High",
    iconSrc: "/BrainIconHigh.svg",
  },
] as const

export type { ReasoningEffort } from "@/lib/chat-models"
export type ReasoningEffortOption = (typeof REASONING_EFFORTS)[number]

export const COMPOSER_USAGE = {
  ariaLabel: "Thread usage",
  longChatAriaLabel: "Thread usage. Start a new chat",
  cost: "Cost",
  thread: "Thread",
  lastTurn: "Last turn",
  context: "Context",
  input: "Input",
  output: "Output",
  cacheHits: "Cache hits",
  cacheWrites: "Cache writes",
  cacheEstimated: "Cache reads priced at half the input rate",
  tokensEstimated: "Older turns estimate tokens from message length",
  longChat:
    "Start a new chat. Long threads lose earlier details and start inventing things.",
  warnRatio: 0.8,
} as const

export { ATTACHMENT_CONTEXT_COPY } from "@/lib/attachment-context"

export const SEARCH_TOGGLE = {
  label: "Search",
  enableTooltip: "Search the web",
  disableTooltip: "Disable search grounding",
  unsupportedTooltip: "Web search is not supported for this model",
  limitEditorLabel: "Search count",
  decreaseLimit: "Decrease search count",
  increaseLimit: "Increase search count",
  confirmLimit: "Done",
} as const
