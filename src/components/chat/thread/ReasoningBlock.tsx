import { memo, useEffect, useState } from "react"
import { BrainIcon, ChevronDownIcon } from "lucide-react"

import { StreamdownMarkdown } from "@/components/chat/thread/StreamdownMarkdown"
import { REASONING_BLOCK } from "@/components/chat/thread/constants"
import { cn } from "@/lib/utils"

type ReasoningBlockProps = {
  content: string
  isStreamingThinking: boolean
}

export const ReasoningBlock = memo(function ReasoningBlock({
  content,
  isStreamingThinking,
}: ReasoningBlockProps) {
  const [expanded, setExpanded] = useState(isStreamingThinking)
  const [userToggled, setUserToggled] = useState(false)

  useEffect(() => {
    if (userToggled) return
    setExpanded(isStreamingThinking)
  }, [isStreamingThinking, userToggled])

  const label = isStreamingThinking
    ? REASONING_BLOCK.streamingLabel
    : REASONING_BLOCK.label

  return (
    <div className="mb-3 w-full min-w-0">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center gap-2 rounded-sm p-2 text-base text-foreground/90 transition-colors select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
        onClick={() => {
          setUserToggled(true)
          setExpanded((value) => !value)
        }}
      >
        <BrainIcon className="size-4 shrink-0 text-foreground/70" />
        <span className="min-w-0 flex-1 text-left font-medium text-foreground">
          {label}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-foreground/70 transition-transform duration-200 ease-out",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded ? (
        <div className="mt-2 w-full rounded-2xl border border-border bg-[color-mix(in_srgb,var(--foreground)_5%,var(--background))]">
          <div className="w-full p-4 sm:p-5">
            <StreamdownMarkdown
              text={content}
              isStreaming={isStreamingThinking}
              className="text-sm leading-6 text-foreground/85 [&_[data-streamdown]]:text-foreground/85"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
})
