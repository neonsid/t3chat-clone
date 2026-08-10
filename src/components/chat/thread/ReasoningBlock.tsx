import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { BrainIcon, ChevronDownIcon } from "lucide-react"

import { BouncingDots } from "@/components/chat/thread/BouncingDots"
import { StreamdownMarkdown } from "@/components/chat/thread/StreamdownMarkdown"
import { REASONING_BLOCK } from "@/components/chat/thread/constants"
import { cn } from "@/lib/utils"

type ReasoningBlockProps = {
  content: string
  isStreamingThinking: boolean
}

export function ReasoningBlock({
  content,
  isStreamingThinking,
}: ReasoningBlockProps) {
  const [expanded, setExpanded] = useState(isStreamingThinking)
  const [userToggled, setUserToggled] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (userToggled) return
    setExpanded(isStreamingThinking)
  }, [isStreamingThinking, userToggled])

  useLayoutEffect(() => {
    const element = bodyRef.current
    if (!element || !expanded || !isStreamingThinking) return
    element.scrollTop = element.scrollHeight
  }, [content, expanded, isStreamingThinking])

  const label = isStreamingThinking
    ? REASONING_BLOCK.streamingLabel
    : REASONING_BLOCK.label

  return (
    <div className="mb-3">
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
        <span className="min-w-0 text-left font-medium text-foreground">
          {label}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-foreground/70 transition-transform duration-200 ease-out",
            expanded && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="relative mt-2 rounded-2xl border border-border bg-[color-mix(in_srgb,var(--foreground)_5%,var(--background))]">
            <div
              ref={bodyRef}
              className={cn(
                "overflow-y-auto p-4 [scrollbar-width:none] sm:p-5 [&::-webkit-scrollbar]:hidden",
                REASONING_BLOCK.maxHeightClassName
              )}
            >
              {content ? (
                <StreamdownMarkdown
                  text={content}
                  isStreaming={isStreamingThinking}
                  className="text-sm leading-6 text-foreground/85 [&_[data-streamdown]]:text-foreground/85"
                />
              ) : isStreamingThinking ? (
                <BouncingDots label="Reasoning" />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
