import { ImmediateStrategy } from "@tanstack/ai/client"
import {
  BookOpenIcon,
  CodeXmlIcon,
  GraduationCapIcon,
  SparklesIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type SuggestionCategory = "create" | "explore" | "code" | "learn"

export const SUGGESTION_CATEGORIES: ReadonlyArray<{
  id: SuggestionCategory
  label: string
  icon: LucideIcon
}> = [
  { id: "create", label: "Create", icon: SparklesIcon },
  { id: "explore", label: "Explore", icon: BookOpenIcon },
  { id: "code", label: "Code", icon: CodeXmlIcon },
  { id: "learn", label: "Learn", icon: GraduationCapIcon },
]

export const CHAT_SUGGESTIONS = {
  create: [
    "Write a short story about a robot discovering music",
    "Help me outline a personal website",
    "Draft a witty birthday message",
    "Invent a cocktail for a rainy evening",
  ],
  explore: [
    "How does AI work?",
    "Are black holes real?",
    'How many Rs are in the word "strawberry"?',
    "What is the meaning of life?",
  ],
  code: [
    "Explain recursion with a simple example",
    "Help me debug a React useEffect loop",
    "Write a Python script to rename files in a folder",
    "Compare SQL joins with plain English",
  ],
  learn: [
    "Teach me the basics of probability",
    "What should I know before learning Rust?",
    "Break down how HTTPS certificates work",
    "Give me a 10-minute intro to linear algebra",
  ],
} as const satisfies Record<SuggestionCategory, ReadonlyArray<string>>

export const BOUNCING_DOT_INDICES = [0, 1, 2] as const

export const REASONING_BLOCK = {
  label: "Reasoning",
  streamingLabel: "Reasoning…",
} as const

export const WEB_SEARCH_BLOCK = {
  label: "Web Search",
  streamingLabel: "Running Web Search...",
  workingLabel: "Working",
  faviconUrl(hostname: string) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`
  },
} as const

export const WEB_SEARCH_TOOL_CALL = {
  singular: "1 tool call",
  plural: (count: number) => `${count} tool calls`,
} as const

export const STOPPED_RESPONSE = {
  label: "Stopped by user",
} as const

/** Post-layout retries after opening a thread (no continuous ResizeObserver). */
export const MESSAGE_SCROLLER_ENSURE_END = {
  delaysMs: [0, 50, 150, 400] as const,
} as const

/**
 * Flush every SSE token into useChat. WordBoundaryStrategy only emits when a
 * delta ends with whitespace, which most model tokens do not, so the answer
 * sat in the processor until TEXT_MESSAGE_END and painted in one dump.
 * ChatThreadView still coalesces paints below.
 */
export const CHAT_STREAM_PROCESSOR = {
  chunkStrategy: new ImmediateStrategy(),
} as const

/**
 * Ceiling on how often the streaming message reaches the DOM. Tokens arrive
 * faster than a markdown re-parse is worth, and ~30 updates a second still
 * reads as continuous without a parse on every SSE tick.
 */
export const CHAT_STREAM_RENDER_INTERVAL_MS = 32

export const STREAMDOWN_CODE_LANGUAGE_CLASS = /language-([^\s]+)/

export const CODE_BLOCK = {
  copy: "Copy code",
} as const

/** Streamdown's default intercepts clicks with a confirm modal that is not portaled. */
export const STREAMDOWN_LINK_SAFETY = {
  enabled: false,
} as const

/**
 * Streamdown's table fullscreen overlay is z-50. Header actions are fixed z-60
 * in the same corner as the close control, so the overlay cannot be dismissed.
 */
export const STREAMDOWN_CONTROLS = {
  table: { fullscreen: false },
} as const
