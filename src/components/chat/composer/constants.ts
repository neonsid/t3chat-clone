import { ZapIcon } from "lucide-react"

export const CHAT_COMPOSER_PLACEHOLDERS = {
  newThread: "Type your message here...",
  followUp: "Ask for follow-up changes...",
  loadingConversation: "Loading conversation...",
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
    icon: { kind: "component", component: ZapIcon },
  },
  {
    value: "low",
    label: "Low",
    icon: { kind: "asset", src: "/BrainIconLow.svg" },
  },
  {
    value: "medium",
    label: "Medium",
    icon: { kind: "asset", src: "/BrainIconMedium.svg" },
  },
  {
    value: "high",
    label: "High",
    icon: { kind: "asset", src: "/BrainIconHigh.svg" },
  },
] as const

export type { ReasoningEffort } from "@/lib/chat-models"
export type ReasoningEffortOption = (typeof REASONING_EFFORTS)[number]
