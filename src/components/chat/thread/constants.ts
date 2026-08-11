import { WordBoundaryStrategy } from "@tanstack/ai/client"
import { createCodePlugin } from "@streamdown/code"
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

export const CHAT_SUGGESTIONS: Record<SuggestionCategory, string[]> = {
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
}

export const BOUNCING_DOT_INDICES = [0, 1, 2] as const

export const REASONING_BLOCK = {
  label: "Reasoning",
  streamingLabel: "Reasoning…",
} as const

/** Post-layout retries after opening a thread (no continuous ResizeObserver). */
export const MESSAGE_SCROLLER_ENSURE_END = {
  delaysMs: [0, 50, 150, 400] as const,
} as const

/**
 * Emits UI message updates at word boundaries instead of every SSE token.
 * Cuts ChatThreadView re-renders several-fold without visible streaming lag.
 */
export const CHAT_STREAM_PROCESSOR = {
  chunkStrategy: new WordBoundaryStrategy(),
} as const

export const STREAMDOWN_PLUGINS = {
  code: createCodePlugin({ themes: ["github-light", "min-dark"] }),
}
