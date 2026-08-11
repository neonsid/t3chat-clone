import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import type { UIMessage } from "@tanstack/ai-react"
import { useMutation } from "convex/react"

import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"

import { BouncingDots } from "@/components/chat/thread/BouncingDots"
import { ChatEmptyState } from "@/components/chat/thread/ChatEmptyState"
import { ChatMessage } from "@/components/chat/thread/ChatMessage"
import {
  deriveTimelineMinimapItems,
  findLastUserMessageId,
  focusComposerInput,
  isSameMessageList,
} from "@/components/chat/thread/logic"
import { TimelineMinimap } from "@/components/chat/timeline/TimelineMinimap"
import type { TimelineMinimapItem } from "@/components/chat/timeline/types"
import {
  MemoMessageScrollerButton,
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/shared/ui/message-scroller"
import { useCoalescedValue } from "@/hooks/useCoalescedValue"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import {
  useThreadComposerHasDraft,
  useThreadComposerReasoningEffort,
} from "@/hooks/useThreadComposerState"
import {
  CHAT_MODEL_CONFIG,
  DEFAULT_CHAT_MODEL_ID,
  isChatModelId,
  resolveChatModel,
} from "@/lib/chat-models"
import {
  chatMessageHasContent,
  chatMessageText,
  chatMessageThinking,
} from "@/lib/threads"
import type { AssistantGenerationStats } from "@/lib/threads"
import { cn } from "@/lib/utils"
import { chatRuntimeStore, useChatRuntimeStore } from "@/stores/chat-runtime-store"
import { useChatUiStore, useChatUiStoreApi } from "@/stores/AppStateProvider"
import { getThreadComposerState } from "@/stores/chat-ui-store"
import {
  CHAT_STREAM_PROCESSOR,
  CHAT_STREAM_RENDER_INTERVAL_MS,
  MESSAGE_SCROLLER_ENSURE_END,
  REASONING_BLOCK,
} from "@/components/chat/thread/constants"
import { CHAT_COMPOSER_OVERLAY_HEIGHT } from "@/components/chat/composer/constants"

/**
 * When autoScroll is off, the scroller's one-shot defaultScrollPosition="end"
 * can land short because deferred markdown grows later. A few delayed
 * corrections are enough — continuous ResizeObserver + scrollToEnd floods the
 * scroller store.
 *
 * Must render after the viewport: scrollToEnd is a no-op until the viewport has
 * registered its scroll element.
 */
function MessageScrollerEnsureEnd({
  threadId,
  hasMessages,
}: {
  threadId: string
  hasMessages: boolean
}) {
  const { scrollToEnd } = useMessageScroller()
  const scrollToEndRef = useRef(scrollToEnd)
  scrollToEndRef.current = scrollToEnd

  useLayoutEffect(() => {
    if (!hasMessages) return

    const timeouts: number[] = []
    for (const delayMs of MESSAGE_SCROLLER_ENSURE_END.delaysMs) {
      timeouts.push(
        window.setTimeout(() => {
          scrollToEndRef.current({ behavior: "auto" })
        }, delayMs)
      )
    }

    return () => {
      for (const timeout of timeouts) window.clearTimeout(timeout)
    }
  }, [threadId, hasMessages])

  return null
}

const ChatTimelineMinimap = memo(function ChatTimelineMinimap({
  items,
  bottomInset,
}: {
  items: TimelineMinimapItem[]
  bottomInset: number
}) {
  const { scrollToMessage } = useMessageScroller()
  const onSelect = useCallback(
    (item: TimelineMinimapItem) => {
      scrollToMessage(item.id, {
        align: "center",
        behavior: "smooth",
      })
    },
    [scrollToMessage]
  )

  return (
    <TimelineMinimap items={items} bottomInset={bottomInset} onSelect={onSelect} />
  )
})

/**
 * The memo boundary that matters. It owns the scroller wrapper too, so a chunk
 * costs one shallow compare per row instead of reconciling every message
 * subtree — memoizing further up can't help, because the message list is the
 * very prop that changes.
 */
const ChatMessageRow = memo(function ChatMessageRow({
  message,
  isStreaming,
  isScrollAnchor,
  isStopped,
  generationStats,
}: {
  message: UIMessage
  isStreaming: boolean
  isScrollAnchor: boolean
  isStopped: boolean
  generationStats: AssistantGenerationStats | undefined
}) {
  return (
    <MessageScrollerItem messageId={message.id} scrollAnchor={isScrollAnchor}>
      <ChatMessage
        message={message}
        isStreaming={isStreaming}
        isStopped={isStopped}
        generationStats={generationStats}
      />
    </MessageScrollerItem>
  )
})

export function ChatThreadView({
  threadId,
  threadStateKey,
  initialMessages,
  generationStats,
  stoppedMessageIds,
  isReady,
  isAuthenticated,
  userName,
  onRequireAuthentication,
}: {
  threadId: string
  threadStateKey: string
  initialMessages: UIMessage[]
  generationStats: Record<string, AssistantGenerationStats>
  stoppedMessageIds: ReadonlySet<string>
  isReady: boolean
  isAuthenticated: boolean
  userName: string
  onRequireAuthentication: () => void
}) {
  const activeTurn = useChatRuntimeStore((state) => state.activeTurn)
  const activeTurnContent = useChatRuntimeStore(
    (state) => state.activeTurnContent
  )
  const [workStartedAt, setWorkStartedAt] = useState<number | null>(null)
  const [locallyStoppedMessageIds, setLocallyStoppedMessageIds] = useState<
    ReadonlySet<string>
  >(() => new Set())
  const stopStreamingMessage = useMutation(api.chatRuns.stopFromClient)
  // Do not subscribe to draft here — every keystroke would re-render the scroller.
  const hasDraft = useThreadComposerHasDraft(threadStateKey)
  const reasoningEffort = useThreadComposerReasoningEffort(threadStateKey)
  const chatUi = useChatUiStoreApi()
  const setDraft = useChatUiStore((state) => state.setDraft)
  const clearDraft = useChatUiStore((state) => state.clearDraft)
  const pendingSubmission = useChatUiStore(
    (state) => state.pendingSubmissions[threadId]
  )
  const takePendingSubmission = useChatUiStore(
    (state) => state.takePendingSubmission
  )
  const hasPendingSubmission = Boolean(pendingSubmission)
  const modelPreferences = useModelPreferences()
  const selectedModelId = isChatModelId(modelPreferences.selectedModelId)
    ? modelPreferences.selectedModelId
    : DEFAULT_CHAT_MODEL_ID
  const modelConfig = CHAT_MODEL_CONFIG[selectedModelId]
  const effectiveReasoningEffort = modelConfig.supportedReasoningEfforts.some(
    (effort) => effort === reasoningEffort
  )
    ? reasoningEffort
    : modelConfig.defaultReasoningEffort
  // Instant is not the same as silent: Gemini still thinks minimally on it,
  // while models without effort control never reason at any setting. Asking the
  // resolved model keeps that distinction out of the view.
  const providerReasoningEffort = resolveChatModel(
    selectedModelId,
    effectiveReasoningEffort
  )?.providerReasoningEffort
  const expectsReasoning =
    providerReasoningEffort !== undefined && providerReasoningEffort !== "none"
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
    streamProcessor: CHAT_STREAM_PROCESSOR,
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
    !hasDraft
  const lastMessage = messages.at(-1)

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

  // Freeze minimap while streaming so assistant-text growth does not rebuild it
  // on every chunk. A new turn changes the length, and the answer that just
  // finished is picked up when the stream settles — neither happens mid-chunk,
  // so this stays O(1) on the streaming path.
  const minimapRevision = `${messages.length}:${messages.at(-1)?.id ?? ""}:${
    isLoading ? "streaming" : "settled"
  }`

  const minimapItemsRef = useRef<TimelineMinimapItem[]>([])
  const minimapRevisionRef = useRef("")
  if (minimapRevisionRef.current !== minimapRevision) {
    minimapRevisionRef.current = minimapRevision
    minimapItemsRef.current = deriveTimelineMinimapItems(messages)
  }
  const minimapItems = minimapItemsRef.current

  // Only the trailing assistant message changes mid-stream, so hold the rows
  // above it at the snapshot taken when the turn started. They then sit outside
  // the streaming render pass instead of being rebuilt on every chunk.
  const streamingMessage =
    isLoading && lastMessage?.role === "assistant" ? lastMessage : null
  const historySource = streamingMessage
    ? displayMessages.slice(0, -1)
    : displayMessages
  const historyRef = useRef(historySource)
  if (
    !streamingMessage ||
    !isSameMessageList(historyRef.current, historySource)
  ) {
    historyRef.current = historySource
  }
  const history = historyRef.current

  const renderedStreamingMessage = useCoalescedValue(
    streamingMessage,
    CHAT_STREAM_RENDER_INTERVAL_MS,
    streamingMessage !== null
  )

  const latestUserMessageId = findLastUserMessageId(displayMessages)
  const scrollAnchorId = isLoading ? latestUserMessageId : null

  const historyRows = useMemo(
    () =>
      history.map((message) => (
        <ChatMessageRow
          key={message.id}
          message={message}
          isStreaming={false}
          isScrollAnchor={message.id === scrollAnchorId}
          isStopped={
            stoppedMessageIds.has(message.id) ||
            locallyStoppedMessageIds.has(message.id)
          }
          generationStats={generationStats[message.id]}
        />
      )),
    [
      generationStats,
      history,
      locallyStoppedMessageIds,
      scrollAnchorId,
      stoppedMessageIds,
    ]
  )

  // The assistant message exists from the moment the model answers, which is
  // before its first token arrives. Nothing to render there yet, so the wait
  // stays on the dots instead of an empty row.
  const isAwaitingFirstContent =
    renderedStreamingMessage !== null &&
    !chatMessageHasContent(renderedStreamingMessage)

  const showPendingDots =
    (isLoading && lastMessage?.role === "user") ||
    isAwaitingFirstContent ||
    ((hasPendingSubmission || hasStartedTurn || activeTurn) && isEmptyThread)
  // Nothing visible distinguishes the two waits, but a reader on a screen
  // reader is told which one this is.
  const pendingDotsLabel =
    isAwaitingFirstContent && expectsReasoning
      ? REASONING_BLOCK.streamingLabel
      : undefined

  // One flat keyed list rather than a history component plus a tail: when the
  // stream settles and the tail joins the history it keeps its key in the same
  // child slot, so React matches it instead of remounting the finished message.
  // Mid-turn is not ours to hold onto — the processor names the assistant
  // message itself when reasoning starts, then renames it to the provider's id
  // once the answer does, and that one remount happens whatever we key on.
  const messageRows =
    renderedStreamingMessage && !isAwaitingFirstContent
      ? [
          ...historyRows,
          <ChatMessageRow
            key={renderedStreamingMessage.id}
            message={renderedStreamingMessage}
            isStreaming
            isScrollAnchor={false}
            isStopped={false}
            generationStats={undefined}
          />,
        ]
      : historyRows

  function submitMessage(content?: string) {
    const text =
      content ??
      getThreadComposerState(chatUi.getState(), threadStateKey).draft.trim()
    if (!isReady || !text || isLoading) return
    if (!isAuthenticated) {
      onRequireAuthentication()
      return
    }

    clearDraft(threadStateKey)
    setWorkStartedAt(Date.now())
    void sendMessage({
      id: crypto.randomUUID(),
      content: [{ type: "text", content: text }],
    })
  }

  function fillPrompt(prompt: string) {
    setDraft(threadStateKey, prompt)
    queueMicrotask(focusComposerInput)
  }

  function stopGeneration() {
    // Mark it here as well as reading the persisted status: the mutation below
    // lands a beat later, and a guest thread never gets one at all.
    const stoppedId = streamingMessage?.id
    if (stoppedId) {
      setLocallyStoppedMessageIds((previous) =>
        previous.has(stoppedId) ? previous : new Set(previous).add(stoppedId)
      )
    }

    // Claim the answer at the text on screen before letting go of the stream.
    // The server keeps receiving for as long as the abort takes to reach the
    // model, and whichever side writes first owns what the reader sees on their
    // next visit.
    if (streamingMessage && isAuthenticated) {
      void stopStreamingMessage({
        threadId: threadId as Id<"threads">,
        assistantMessageId: streamingMessage.id,
        content: chatMessageText(streamingMessage),
        thinking: chatMessageThinking(streamingMessage) || undefined,
      }).catch(() => undefined) // The run's own stop still closes it out.
    }

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

  return (
    <div className="chat-surface absolute inset-0 min-h-0 overflow-hidden bg-background text-foreground">
      <MessageScrollerProvider
        // Never enable library autoScroll while idle: following-bottom + content
        // resize calls scrollToEnd forever and floods the scroll store. Stick to
        // the bottom via defaultScrollPosition + EnsureEnd; during a turn the
        // user-message scrollAnchor keeps the viewport stable.
        autoScroll={false}
        defaultScrollPosition="end"
      >
        <div
          aria-busy={!isReady || isLoading}
          className="absolute inset-0 z-0 overflow-hidden"
          style={{
            paddingBottom: `max(0px, calc(var(${CHAT_COMPOSER_OVERLAY_HEIGHT.cssVar}, ${CHAT_COMPOSER_OVERLAY_HEIGHT.fallbackPx}px) - ${CHAT_COMPOSER_OVERLAY_HEIGHT.threadInsetPx}px))`,
          }}
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
                  {messageRows}

                  {showPendingDots ? (
                    <MessageScrollerItem messageId="pending-assistant">
                      <BouncingDots className="px-1" label={pendingDotsLabel} />
                    </MessageScrollerItem>
                  ) : null}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              {!isEmptyThread && <MemoMessageScrollerButton />}
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
