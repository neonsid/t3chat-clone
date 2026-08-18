import { Fragment, useState } from "react"
import { CheckIcon, ClockIcon } from "lucide-react"

import { TEMPORARY_CHAT } from "@/components/chat/temporary-chat/constants"
import {
  CHAT_SUGGESTIONS,
  SUGGESTION_CATEGORIES,
} from "@/components/chat/thread/constants"
import type { SuggestionCategory } from "@/components/chat/thread/constants"
import { Button } from "@/components/shared/ui/button"
import { Separator } from "@/components/shared/ui/separator"
import { cn } from "@/lib/utils"

interface ChatEmptyStateProps {
  userName?: string
  isTemporary?: boolean
  onSelectPrompt: (prompt: string) => void
  className?: string
}

export function ChatEmptyState({
  userName = "there",
  isTemporary = false,
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
      <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {isTemporary ? (
          <>
            <span className="relative inline-flex shrink-0">
              <ClockIcon aria-hidden="true" className="size-8" />
              <CheckIcon
                aria-hidden="true"
                className="absolute -right-0.5 -bottom-0.5 size-3.5"
              />
            </span>
            {TEMPORARY_CHAT.label}
          </>
        ) : (
          `How can I help you, ${userName}?`
        )}
      </h1>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {SUGGESTION_CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <Button
              key={category.id}
              type="button"
              variant="outline"
              aria-pressed={category.id === activeCategory}
              onClick={() => setActiveCategory(category.id)}
              className="gap-2 rounded-full px-3.5 text-foreground aria-pressed:border-foreground/20 aria-pressed:bg-accent aria-pressed:text-foreground"
            >
              <Icon className="size-4" />
              {category.label}
            </Button>
          )
        })}
      </div>

      <div className="mt-8 flex w-full flex-col">
        {CHAT_SUGGESTIONS[activeCategory].map((prompt, index) => (
          <Fragment key={prompt}>
            {index > 0 && <Separator className="my-1" />}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelectPrompt(prompt)}
              className="h-auto w-full justify-start rounded-lg px-3 py-2.5 text-left text-[15px] font-medium whitespace-normal text-foreground"
            >
              {prompt}
            </Button>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
