import { memo, useState } from "react"
import type { UIMessage } from "@tanstack/ai-react"
import {
  CheckIcon,
  CircleSlashIcon,
  Clock3Icon,
  CopyIcon,
  CpuIcon,
  Undo2Icon,
  ZapIcon,
} from "lucide-react"
import { ReasoningBlock } from "@/components/chat/thread/ReasoningBlock"
import { StreamdownMarkdown } from "@/components/chat/thread/StreamdownMarkdown"
import { STOPPED_RESPONSE } from "@/components/chat/thread/constants"
import { Button } from "@/components/shared/ui/button"
import {
  chatMessageText,
  chatMessageThinking,
  formatShortTimestamp,
} from "@/lib/threads"
import type { AssistantGenerationStats } from "@/lib/threads"

async function copyText(text: string) {
  if (!text) return
  await navigator.clipboard.writeText(text)
}

function MessageCopyControl({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      className="size-6 text-muted-foreground hover:text-foreground"
      aria-label={copied ? "Copied" : "Copy message"}
      onClick={() => {
        void copyText(text).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1200)
        })
      }}
    >
      {copied ? (
        <CheckIcon className="size-3" />
      ) : (
        <CopyIcon className="size-3" />
      )}
    </Button>
  )
}

type ChatMessageProps = {
  message: UIMessage
  isStreaming?: boolean
  isStopped?: boolean
  expectsReasoning?: boolean
  generationStats?: AssistantGenerationStats
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming = false,
  isStopped = false,
  expectsReasoning = false,
  generationStats,
}: ChatMessageProps) {
  const isUser = message.role === "user"
  const text = chatMessageText(message)
  const thinking = chatMessageThinking(message)
  const timestamp = formatShortTimestamp(message.createdAt)

  if (isUser) {
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="relative max-w-[80%] rounded-2xl border border-border/70 bg-[var(--message-surface,var(--accent))] p-3 text-[15px] leading-6 whitespace-pre-wrap text-[var(--message-foreground,var(--foreground))]">
          {text}
        </div>
        <div className="flex w-full max-w-[80%] items-center justify-end pe-1 text-xs tabular-nums opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
          <div className="flex shrink-0 items-center gap-2">
            {timestamp ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {timestamp}
              </p>
            ) : null}
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="size-6 text-muted-foreground hover:text-foreground"
                aria-label="Reply"
                disabled
              >
                <Undo2Icon className="size-3" />
              </Button>
              {text ? <MessageCopyControl text={text} /> : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Standing in for reasoning that has not arrived only makes sense for a run
  // that reasons. Without that check every model opens with a phantom
  // "Reasoning…" for however long the first token takes.
  const isStreamingThinking = isStreaming && !text && expectsReasoning
  const showReasoning = Boolean(thinking) || isStreamingThinking

  return (
    <div className="group/assistant pb-2">
      <div className="relative min-w-0 px-1 py-0.5">
        {showReasoning ? (
          <ReasoningBlock
            content={thinking}
            isStreamingThinking={isStreamingThinking}
          />
        ) : null}

        {text ? (
          <StreamdownMarkdown text={text} isStreaming={isStreaming} />
        ) : null}

        {/* Stays visible instead of hiding behind hover like the stats row: it
            explains why the answer ends where it does. */}
        {isStopped && !isStreaming ? (
          <p
            role="status"
            className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <CircleSlashIcon aria-hidden="true" className="size-4 shrink-0" />
            {STOPPED_RESPONSE.label}
          </p>
        ) : null}

        {(text || timestamp || generationStats) && !isStreaming ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums opacity-0 transition-opacity duration-200 group-hover/assistant:opacity-100 focus-within:opacity-100">
            {generationStats ? (
              <div
                data-assistant-generation-stats="true"
                aria-label="Response generation statistics"
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span className="font-semibold text-foreground/75">
                  {generationStats.modelName} ({generationStats.mode})
                </span>
                {/* A cut-short run has no usage report and no meaningful rate
                    or completion time, so only the token count survives — as an
                    estimate from the chunks that did arrive. */}
                {isStopped ? (
                  <span className="inline-flex items-center gap-1">
                    <CpuIcon aria-hidden="true" className="size-3.5" />~
                    {generationStats.outputTokens.toLocaleString()} tokens
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <ZapIcon aria-hidden="true" className="size-3.5" />
                      {generationStats.tokensPerSecond.toFixed(2)} tok/sec
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CpuIcon aria-hidden="true" className="size-3.5" />
                      {generationStats.outputTokens.toLocaleString()} tokens
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3Icon aria-hidden="true" className="size-3.5" />
                      Time-to-First:{" "}
                      {generationStats.timeToFirstTokenSeconds.toFixed(4)} sec
                    </span>
                  </>
                )}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              {text ? <MessageCopyControl text={text} /> : null}
              {timestamp && !isStopped ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {timestamp}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
})
