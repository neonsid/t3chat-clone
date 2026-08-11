import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import type { UIMessage } from "@tanstack/ai-react"

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
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useThreadSubmissionState } from "@/hooks/useThreadComposerState"
import {
  CHAT_MODEL_CONFIG,
  DEFAULT_CHAT_MODEL_ID,
  isChatModelId,
} from "@/lib/chat-models"
import type { AssistantGenerationStats } from "@/lib/threads"
import { cn } from "@/lib/utils"
import { chatRuntimeStore, useChatRuntimeStore } from "@/stores/chat-runtime-store"
import { useChatUiStore } from "@/stores/AppStateProvider"
import { MESSAGE_SCROLLER_ENSURE_END } from "@/components/chat/thread/constants"

/**
 * When autoScroll is off, the scroller's one-shot defaultScrollPosition="end"
 * can land short because message items use content-visibility placeholders until
 * painted, and deferred markdown (e.g. reasoning) grows later. Keep correcting
 * until content height stabilizes so the last assistant message is visible on
 * thread load. Runs once per thread (or when a thread gains its first message),
 * not when streaming ends, so a user who scrolled up during a response stays put.
 *
 * Must render after the viewport: scrollToEnd is a no-op until the viewport has
 * registered its scroll element, and layout effects run in tree order, so placing
 * this earlier costs the pre-paint pass and leaves only the settle pass, which
 * lands after the browser has already painted the top of the thread.
 */
function MessageScrollerEnsureEnd({
  threadId,
  hasMessages,
}: {
  threadId: string
  hasMessages: boolean
}) {
  const { scrollToEnd } = useMessageScroller()
  const hostRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!hasMessages) return

    const scroller = hostRef.current?.closest('[data-slot="message-scroller"]')
    const content = scroller?.querySelector(
      '[data-slot="message-scroller-content"]',
    )
    if (!(content instanceof HTMLElement)) {
      scrollToEnd({ behavior: "auto" })
      return
    }

    let cancelled = false
    let lastHeight = -1
    let stablePolls = 0
    const startedAt = performance.now()

    const stickToEnd = () => {
      if (cancelled) return
      scrollToEnd({ behavior: "auto" })
      const height = content.scrollHeight
      if (height === lastHeight) {
        stablePolls += 1
      } else {
        stablePolls = 0
        lastHeight = height
      }
    }

    stickToEnd()

    const observer = new ResizeObserver(() => stickToEnd())
    observer.observe(content)

    const interval = window.setInterval(() => {
      stickToEnd()
      if (
        stablePolls >= MESSAGE_SCROLLER_ENSURE_END.stablePolls ||
        performance.now() - startedAt >= MESSAGE_SCROLLER_ENSURE_END.maxMs
      ) {
        window.clearInterval(interval)
        observer.disconnect()
      }
    }, MESSAGE_SCROLLER_ENSURE_END.pollMs)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      observer.disconnect()
    }
  }, [threadId, hasMessages, scrollToEnd])

  return <div ref={hostRef} className="hidden" aria-hidden />
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
  threadStateKey,
  initialMessages,
  generationStats,
  isReady,
  isAuthenticated,
  userName,
  onRequireAuthentication,
}: {
  threadId: string
  threadStateKey: string
  initialMessages: UIMessage[]
  generationStats: Record<string, AssistantGenerationStats>
  isReady: boolean
  isAuthenticated: boolean
  userName: string
  onRequireAuthentication: () => void
}) {
  const composerHeight = useChatRuntimeStore((state) => state.composerHeight)
  const activeTurn = useChatRuntimeStore((state) => state.activeTurn)
  const activeTurnContent = useChatRuntimeStore(
    (state) => state.activeTurnContent
  )
  const [workStartedAt, setWorkStartedAt] = useState<number | null>(null)
  const composer = useThreadSubmissionState(threadStateKey)
  const pendingSubmission = useChatUiStore(
    (state) => state.pendingSubmissions[threadId]
  )
  const takePendingSubmission = useChatUiStore(
    (state) => state.takePendingSubmission
  )
  const hasPendingSubmission = Boolean(pendingSubmission)
  const modelPreferences = useModelPreferences()
  const modelConfig = isChatModelId(modelPreferences.selectedModelId)
    ? CHAT_MODEL_CONFIG[modelPreferences.selectedModelId]
    : CHAT_MODEL_CONFIG[DEFAULT_CHAT_MODEL_ID]
  const effectiveReasoningEffort = modelConfig.supportedReasoningEfforts.some(
    (effort) => effort === composer.reasoningEffort
  )
    ? composer.reasoningEffort
    : modelConfig.defaultReasoningEffort
  const forwardedProps = useMemo(
    () => ({
      modelId: modelPreferences.selectedModelId,
      reasoningEffort: effectiveReasoningEffort,
    }),
    [effectiveReasoningEffort, modelPreferences.selectedModelId]
  )

  const { messages, sendMessage, stop, isLoading, error } = useChat({
    threadId,
    initialMessages,
    forwardedProps,
    connection: fetchServerSentEvents("/api/chat"),
  })

  const isEmptyThread = messages.length === 0
  // A turn is underway from the moment it is dispatched, which is before the
  // optimistic message lands. Without this the view flashes the empty state
  // between consuming the queued submission and the first render with it.
  const hasStartedTurn = workStartedAt != null
  const showEmptyState =
    isReady &&
    isEmptyThread &&
    !hasPendingSubmission &&
    !hasStartedTurn &&
    !activeTurn &&
    composer.draft.trim().length === 0
  const lastMessage = messages.at(-1)
  const showPendingDots =
    (isLoading && lastMessage?.role === "user") ||
    ((hasPendingSubmission || hasStartedTurn || activeTurn) && isEmptyThread)

  // During the draft→thread handoff the real user message isn't dispatched until
  // after navigation, so paint an optimistic bubble from the in-flight text.
  // Reusing the pending message id lets the real message replace it in place
  // (same key) instead of appearing above the dots and pushing them down.
  const optimisticUserContent =
    isEmptyThread && (activeTurn || hasPendingSubmission)
      ? activeTurnContent || pendingSubmission?.content || ""
      : ""
  const optimisticUserMessage = useMemo<UIMessage | null>(() => {
    if (!optimisticUserContent) return null
    return {
      id: pendingSubmission?.messageId ?? "optimistic-user",
      role: "user",
      parts: [{ type: "text", content: optimisticUserContent }],
      createdAt: new Date(),
    }
  }, [optimisticUserContent, pendingSubmission?.messageId])
  const displayMessages = optimisticUserMessage
    ? [optimisticUserMessage]
    : messages

  const minimapItems = useMemo(
    () => deriveTimelineMinimapItems(messages),
    [messages]
  )

  function submitMessage(content = composer.draft.trim()) {
    if (!isReady || !content || isLoading) return
    if (!isAuthenticated) {
      onRequireAuthentication()
      return
    }

    composer.clearDraft(threadStateKey)
    setWorkStartedAt(Date.now())
    void sendMessage({
      id: crypto.randomUUID(),
      content: [{ type: "text", content }],
    })
  }

  function fillPrompt(prompt: string) {
    composer.setDraft(threadStateKey, prompt)
    queueMicrotask(focusComposerInput)
  }

  function stopGeneration() {
    stop()
  }

  const submitMessageRef = useRef(submitMessage)
  submitMessageRef.current = submitMessage

  const stopGenerationRef = useRef(stopGeneration)
  stopGenerationRef.current = stopGeneration

  const flushPendingSubmissionRef = useRef(() => {})
  flushPendingSubmissionRef.current = () => {
    if (!isReady || !isAuthenticated) return
    const pending = takePendingSubmission(threadId)
    if (!pending) return

    setWorkStartedAt(Date.now())
    void sendMessage({
      id: pending.messageId,
      content: [{ type: "text", content: pending.content }],
    })
  }

  const messagePairs = pairMessagesWithPreviousUser(displayMessages)
  const latestUserMessageId = findLastUserMessageId(displayMessages)

  useLayoutEffect(() => {
    return chatRuntimeStore.getState().bindActions({
      submit: () => submitMessageRef.current(),
      stop: () => stopGenerationRef.current(),
    })
  }, [threadId])

  // Draft submit queues a pending message then navigates here and requests a
  // flush. Registering the flusher (instead of sending on mount) keeps the
  // handoff event-driven: only the surviving ready view sends, once.
  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return
    return chatRuntimeStore
      .getState()
      .registerPendingFlusher(threadId, () => flushPendingSubmissionRef.current())
  }, [threadId, isReady, isAuthenticated])

  useLayoutEffect(() => {
    chatRuntimeStore.getState().setPanelState({
      isLoading,
      error: error ?? null,
      isReady,
      isEmptyThread,
      effectiveReasoningEffort,
      supportedReasoningEfforts: modelConfig.supportedReasoningEfforts,
      modelLoading: modelPreferences.isLoading,
    })
  }, [
    effectiveReasoningEffort,
    error,
    isEmptyThread,
    isLoading,
    isReady,
    modelConfig.supportedReasoningEfforts,
    modelPreferences.isLoading,
  ])

  useLayoutEffect(() => {
    return () => {
      chatRuntimeStore.getState().reset()
    }
  }, [threadId])

  // Hand the "sending" state off to the real stream: once this thread's turn is
  // actually underway (or has failed), activeTurn has done its bridging job.
  useLayoutEffect(() => {
    if (isLoading || error) chatRuntimeStore.getState().setActiveTurn(false)
  }, [isLoading, error])

  const activeWorkedMs =
    isLoading && workStartedAt != null ? Date.now() - workStartedAt : null

  return (
    <div className="chat-surface absolute inset-0 min-h-0 overflow-hidden bg-background text-foreground">
      <MessageScrollerProvider
        autoScroll={!isLoading}
        defaultScrollPosition="end"
      >
        <div
          aria-busy={!isReady || isLoading}
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
                  aria-busy={!isReady || isLoading}
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
              <MessageScrollerEnsureEnd
                threadId={threadId}
                hasMessages={!isEmptyThread}
              />
            </MessageScroller>
          )}
        </div>
      </MessageScrollerProvider>
    </div>
  )
}
