import { Fragment, useState } from "react"
import type { ReactNode } from "react"
import {
  BookOpenIcon,
  CodeXmlIcon,
  GraduationCapIcon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
        "flex w-full max-w-2xl flex-col items-start px-4",
        className
      )}
    >
      <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        How can I help you, {userName}?
      </h1>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.map((category) => (
          <Button
            key={category.id}
            type="button"
            variant="outline"
            aria-pressed={category.id === activeCategory}
            onClick={() => setActiveCategory(category.id)}
            className="gap-2 rounded-full px-3.5 text-muted-foreground aria-pressed:border-foreground/20 aria-pressed:bg-accent aria-pressed:text-foreground"
          >
            {category.icon}
            {category.label}
          </Button>
        ))}
      </div>

      <div className="mt-8 flex w-full flex-col">
        {SUGGESTIONS[activeCategory].map((prompt, index) => (
          <Fragment key={prompt}>
            {index > 0 && <Separator className="my-1" />}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelectPrompt(prompt)}
              className="h-auto w-full justify-start rounded-lg px-3 py-2.5 text-left text-[15px] font-normal whitespace-normal text-muted-foreground"
            >
              {prompt}
            </Button>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
