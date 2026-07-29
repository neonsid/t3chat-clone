import { useState, type ReactNode } from "react"
import {
  BookOpenIcon,
  CodeXmlIcon,
  GraduationCapIcon,
  SparklesIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

type SuggestionCategory = "create" | "explore" | "code" | "learn"

const CATEGORIES: {
  id: SuggestionCategory
  label: string
  icon: ReactNode
}[] = [
  {
    id: "create",
    label: "Create",
    icon: <SparklesIcon className="size-4" />,
  },
  {
    id: "explore",
    label: "Explore",
    icon: <BookOpenIcon className="size-4" />,
  },
  {
    id: "code",
    label: "Code",
    icon: <CodeXmlIcon className="size-4" />,
  },
  {
    id: "learn",
    label: "Learn",
    icon: <GraduationCapIcon className="size-4" />,
  },
]

const SUGGESTIONS: Record<SuggestionCategory, string[]> = {
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

interface ChatEmptyStateProps {
  userName?: string
  onSelectPrompt: (prompt: string) => void
  className?: string
}

export function ChatEmptyState({
  userName = "Siddharth",
  onSelectPrompt,
  className,
}: ChatEmptyStateProps) {
  const [activeCategory, setActiveCategory] =
    useState<SuggestionCategory>("explore")

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col items-center px-4",
        className
      )}
    >
      <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        How can I help you, {userName}?
      </h1>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.map((category) => {
          const isActive = category.id === activeCategory
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors",
                isActive
                  ? "border-foreground/20 bg-accent text-foreground"
                  : "border-border/80 bg-card/40 text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {category.icon}
              {category.label}
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex w-full max-w-md flex-col gap-1">
        {SUGGESTIONS[activeCategory].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="rounded-lg px-3 py-2.5 text-left text-[15px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
