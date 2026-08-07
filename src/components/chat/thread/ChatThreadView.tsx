import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import type { UIMessage } from "@tanstack/ai-react"

import { ChatComposer } from "@/components/chat/composer/ChatComposer"
import { SidebarControl } from "@/components/chat/shell/ChatShellChrome"
import { BouncingDots } from "@/components/chat/thread/BouncingDots"
import { ChatEmptyState } from "@/components/chat/thread/ChatEmptyState"
import { ChatMessage } from "@/components/chat/thread/ChatMessage"
import {
  deriveTimelineMinimapItems,
  findLastUserMessageId,
  focusComposerInput,
  pairMessagesWithPreviousUser,
} from "@/components/chat/thread/logic"
import { TimelineMinimap } from "@/components/chat/timeline/TimelineMinimap"
import type { TimelineMinimapItem } from "@/components/chat/timeline/types"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/shared/ui/message-scroller"
import { useMountEffect } from "@/hooks/useMountEffect"
import { useModelStore } from "@/hooks/useModelStore"
import {
  CHAT_MODEL_CONFIG,
  DEFAULT_CHAT_MODEL_ID,
  isChatModelId,
} from "@/lib/chat-models"
import type { ReasoningEffort } from "@/lib/chat-models"
import type { AssistantGenerationStats } from "@/lib/threads"
import { cn } from "@/lib/utils"

/**
 * When autoScroll is off, the scroller's one-shot defaultScrollPosition="end"
 * can land short because message items use content-visibility placeholders until
 * painted. Re-scroll after layout settles so the last assistant message is visible
 * on thread load. Runs once per thread (or when a thread gains its first message),
 * not when streaming ends, so a user who scrolled up during a response stays put.
 */
function MessageScrollerEnsureEnd({
  threadId,
  hasMessages,
}: {
  threadId: string
  hasMessages: boolean
}) {
  const { scrollToEnd } = useMessageScroller()

  useLayoutEffect(() => {
    if (!hasMessages) return

    scrollToEnd({ behavior: "auto" })

    let frame = 0
    const timeout = window.setTimeout(() => {
      scrollToEnd({ behavior: "auto" })
      frame = requestAnimationFrame(() => scrollToEnd({ behavior: "auto" }))
    }, 120)

    return () => {
      window.clearTimeout(timeout)
      cancelAnimationFrame(frame)
    }
  }, [threadId, hasMessages, scrollToEnd])

  return null
}

function ChatTimelineMinimap({
  items,
  bottomInset,
}: {
  items: TimelineMinimapItem[]
  bottomInset: number
}) {
  const { scrollToMessage } = useMessageScroller()

  return (
    <TimelineMinimap
      items={items}
      bottomInset={bottomInset}
      onSelect={(item) => {
        scrollToMessage(item.id, {
          align: "center",
          behavior: "smooth",
        })
      }}
    />
  )
}

export function ChatThreadView({
  threadId,
  initialMessages,
  generationStats,
  onCreateThread,
  isAuthenticated,
  userName,
  onRequireAuthentication,
  onThreadStarted,
}: {
  threadId: string
  initialMessages: UIMessage[]
  generationStats: Record<string, AssistantGenerationStats>
  onCreateThread: () => void
  isAuthenticated: boolean
  userName: string
  onRequireAuthentication: () => void
  onThreadStarted?: () => void
}) {
  const [input, setInput] = useState("")
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffort>("instant")
  const [composerHeight, setComposerHeight] = useState(148)
  const [workStartedAt, setWorkStartedAt] = useState<number | null>(null)
  const composerOverlayRef = useRef<HTMLDivElement | null>(null)
  const modelState = useModelStore()
  const modelConfig = isChatModelId(modelState.selectedModelId)
    ? CHAT_MODEL_CONFIG[modelState.selectedModelId]
    : CHAT_MODEL_CONFIG[DEFAULT_CHAT_MODEL_ID]
  const effectiveReasoningEffort = modelConfig.supportedReasoningEfforts.some(
    (effort) => effort === reasoningEffort
  )
    ? reasoningEffort
    : modelConfig.supportedReasoningEfforts[0]
  const forwardedProps = useMemo(
    () => ({
      modelId: modelState.selectedModelId,
      reasoningEffort: effectiveReasoningEffort,
    }),
    [effectiveReasoningEffort, modelState.selectedModelId]
  )

  const { messages, sendMessage, stop, isLoading, error } = useChat({
    id: threadId,
    threadId,
    initialMessages,
    forwardedProps,
    connection: fetchServerSentEvents("/api/chat"),
    onFinish() {
      onThreadStarted?.()
    },
    onError() {
      onThreadStarted?.()
    },
  })

  useMountEffect(() => {
    const element = composerOverlayRef.current
    if (!element) return

    const updateHeight = () => {
      setComposerHeight(Math.ceil(element.getBoundingClientRect().height))
    }

    updateHeight()
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateHeight)
    observer?.observe(element)
    window.addEventListener("resize", updateHeight)

    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", updateHeight)
    }
  })

  const isEmptyThread = messages.length === 0
  const showEmptyState = isEmptyThread && input.trim().length === 0
  const lastMessage = messages.at(-1)
  const showPendingDots = isLoading && lastMessage?.role === "user"

  const minimapItems = useMemo(
    () => deriveTimelineMinimapItems(messages),
    [messages]
  )

  function submitMessage(content = input.trim()) {
    if (!content || isLoading) return
    if (!isAuthenticated) {
      onRequireAuthentication()
      return
    }

    setWorkStartedAt(Date.now())
    setInput("")
    void sendMessage({
      id: crypto.randomUUID(),
      content: [{ type: "text", content }],
    })
  }

  function fillPrompt(prompt: string) {
    setInput(prompt)
    queueMicrotask(focusComposerInput)
  }

  function stopGeneration() {
    stop()
    onThreadStarted?.()
  }

  const activeWorkedMs =
    isLoading && workStartedAt != null ? Date.now() - workStartedAt : null
  const messagePairs = pairMessagesWithPreviousUser(messages)
  const latestUserMessageId = findLastUserMessageId(messages)

  return (
    <div className="chat-surface absolute inset-0 min-h-0 overflow-hidden bg-background text-foreground">
      <SidebarControl
        hasConversation={messages.length > 0}
        onCreateThread={onCreateThread}
      />

      <MessageScrollerProvider
        autoScroll={!isLoading}
        defaultScrollPosition="end"
      >
        <MessageScrollerEnsureEnd
          threadId={threadId}
          hasMessages={!isEmptyThread}
        />
        <div
          className="absolute inset-0 z-0 overflow-hidden"
          style={{ paddingBottom: Math.max(0, composerHeight - 16) }}
        >
          {!isEmptyThread && (
            <ChatTimelineMinimap items={minimapItems} bottomInset={0} />
          )}

          {showEmptyState ? (
            <div className="flex size-full flex-col items-center overflow-y-auto">
              {/* mt-auto rather than justify-end so the block still scrolls from
                  its top on short viewports instead of overflowing out of reach. */}
              <ChatEmptyState
                className="mt-auto pt-20 pb-4"
                userName={userName}
                onSelectPrompt={fillPrompt}
              />
            </div>
          ) : (
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent
                  aria-busy={isLoading}
                  className={cn("mx-auto w-full max-w-3xl px-4 pt-20 pb-6")}
                >
                  {messagePairs.map(({ message, previousUserCreatedAt }) => {
                    const isStreaming =
                      isLoading &&
                      message.role === "assistant" &&
                      message.id === messages.at(-1)?.id

                    return (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={
                          isLoading && message.id === latestUserMessageId
                        }
                      >
                        <ChatMessage
                          message={message}
                          isStreaming={isStreaming}
                          previousUserCreatedAt={previousUserCreatedAt}
                          workedMs={isStreaming ? activeWorkedMs : null}
                          generationStats={generationStats[message.id]}
                        />
                      </MessageScrollerItem>
                    )
                  })}

                  {showPendingDots ? (
                    <MessageScrollerItem messageId="pending-assistant">
                      <BouncingDots className="px-1" />
                    </MessageScrollerItem>
                  ) : null}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              {!isEmptyThread && <MessageScrollerButton />}
            </MessageScroller>
          )}
        </div>
      </MessageScrollerProvider>

      <div
        ref={composerOverlayRef}
        data-chat-composer-overlay="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 translate-y-4 pt-2"
      >
        <div className="chat-composer-horizontal-inset w-full">
          <div className="pointer-events-auto relative z-10">
            {error && (
              <p
                className="mb-2 px-1 text-center text-sm text-destructive"
                role="alert"
              >
                {error.message}
              </p>
            )}
            <ChatComposer
              value={input}
              onChange={setInput}
              onSubmit={() => submitMessage()}
              reasoningEffort={effectiveReasoningEffort}
              onReasoningEffortChange={setReasoningEffort}
              onStop={stopGeneration}
              isLoading={isLoading}
              placeholder={
                isEmptyThread
                  ? "Type your message here..."
                  : "Ask for follow-up changes..."
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
