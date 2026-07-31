import { useMemo, useState } from "react"
import type { UIMessage } from "@tanstack/ai-react"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  Undo2Icon,
} from "lucide-react"
import { Streamdown } from "streamdown"
import { createCodePlugin } from "@streamdown/code"

import { BouncingDots } from "@/components/chat/BouncingDots"
import { Button } from "@/components/ui/button"
import { formatShortTimestamp } from "@/lib/threads"
import { cn } from "@/lib/utils"

const streamdownPlugins = {
  code: createCodePlugin({
    themes: ["github-light", "min-dark"],
  }),
}

function getMessageText(message: UIMessage) {
  let text = ""
  for (const part of message.parts) {
    if (part.type === "text") text += part.content
  }
  return text
}

function getThinkingText(message: UIMessage) {
  const parts: string[] = []
  for (const part of message.parts) {
    if (part.type === "thinking") parts.push(part.content)
  }
  return parts.join("\n").trim()
}

function formatWorkedDuration(elapsedMs: number | null | undefined) {
  if (elapsedMs == null || elapsedMs < 0 || !Number.isFinite(elapsedMs)) {
    return null
  }

  const totalSeconds = Math.max(1, Math.round(elapsedMs / 1000))
  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes === 0 ? `${hours}h` : `${hours}h ${remMinutes}m`
}

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
  workedMs?: number | null
  previousUserCreatedAt?: Date | number | string | null
}

export function ChatMessage({
  message,
  isStreaming = false,
  workedMs = null,
  previousUserCreatedAt = null,
}: ChatMessageProps) {
  const isUser = message.role === "user"
  const text = getMessageText(message)
  const thinking = getThinkingText(message)
  const timestamp = formatShortTimestamp(message.createdAt)

  const derivedWorkedMs = useMemo(() => {
    if (workedMs != null) return workedMs
    if (!previousUserCreatedAt || !message.createdAt) return null
    const start = new Date(previousUserCreatedAt).getTime()
    const end = new Date(message.createdAt).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return null
    }
    return end - start
  }, [message.createdAt, previousUserCreatedAt, workedMs])

  if (isUser) {
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="relative max-w-[80%] rounded-2xl border border-border/70 bg-accent p-3 text-[15px] leading-6 whitespace-pre-wrap text-foreground">
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

  const showWorkFold = Boolean(thinking) || (isStreaming && !text)

  return (
    <div className="group/assistant pb-2">
      <div className="relative min-w-0 px-1 py-0.5">
        {showWorkFold && (
          <WorkedForFold
            content={thinking}
            isStreaming={isStreaming && !text}
            workedMs={derivedWorkedMs}
          />
        )}

        {text ? (
          <div className="text-[15px] leading-7 text-foreground/90 [&_[data-streamdown]]:min-w-0">
            <Streamdown
              lineNumbers={false}
              mode="static"
              plugins={streamdownPlugins}
            >
              {text}
            </Streamdown>
          </div>
        ) : isStreaming && !thinking ? (
          <BouncingDots label="Assistant is thinking" />
        ) : null}

        {(text || timestamp) && !isStreaming ? (
          <div className="mt-1.5 flex items-center gap-2 text-xs tabular-nums opacity-0 transition-opacity duration-200 group-hover/assistant:opacity-100 focus-within:opacity-100">
            {text ? <MessageCopyControl text={text} /> : null}
            {timestamp ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {timestamp}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function WorkedForFold({
  content,
  isStreaming,
  workedMs,
}: {
  content: string
  isStreaming: boolean
  workedMs: number | null
}) {
  const [expanded, setExpanded] = useState(false)
  const duration = formatWorkedDuration(workedMs)
  const label = isStreaming
    ? "Working…"
    : duration
      ? `Worked for ${duration}`
      : content
        ? "Worked"
        : "Worked for a moment"
  const Icon = expanded ? ChevronDownIcon : ChevronRightIcon
  const preview = useMemo(() => {
    if (!content) return null
    const firstLine = content
      .split("\n")
      .find((line) => line.trim())
      ?.trim()
    if (!firstLine) return null
    return firstLine.length > 72
      ? `${firstLine.slice(0, 72).trimEnd()}…`
      : firstLine
  }, [content])

  return (
    <div className="mb-3">
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {content ? (
            <div className="mb-2 rounded-2xl border border-border/80 bg-accent p-4 sm:p-5">
              {preview ? (
                <p className="truncate text-sm font-medium text-foreground">
                  {preview}
                </p>
              ) : null}
              <p className="mt-1.5 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                {content}
              </p>
            </div>
          ) : isStreaming ? (
            <div className="mb-2 rounded-2xl border border-border/80 bg-accent p-4 sm:p-5">
              <BouncingDots label="Working" />
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        aria-expanded={expanded}
        className="flex cursor-pointer items-center gap-1 rounded-md px-1 text-xs text-muted-foreground tabular-nums transition-colors select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
        onClick={() => setExpanded((value) => !value)}
      >
        <span>{label}</span>
        <Icon className="size-3.5" />
      </button>
    </div>
  )
}
