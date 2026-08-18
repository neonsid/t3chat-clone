import {
  memo,
  useCallback,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import type { UIMessage } from "@tanstack/ai-react"
import { useMutation, useQuery } from "convex/react"

import { api } from "../../../../convex/_generated/api"
import { asThreadId } from "@/lib/convex-ids"
import {
  estimateTemporaryGenerationStats,
  isTemporaryThreadId,
  toPersistableTemporaryMessages,
} from "@/lib/temporary-chat"

import { BouncingDots } from "@/components/chat/thread/BouncingDots"
import { ChatEmptyState } from "@/components/chat/thread/ChatEmptyState"
import { ChatMessage } from "@/components/chat/thread/ChatMessage"
import type { ThreadMessageAttachment } from "@/components/chat/attachments/types"
import {
  deriveTimelineMinimapItems,
  findLastUserMessageId,
  focusComposerInput,
  resolveFrozenStreamingHistory,
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
  getChatModelById,
  isChatModelId,
  resolveChatModel,
} from "@/lib/chat-models"
import {
  rememberComposerPreviews,
  sentAttachmentsForMessage,
} from "@/lib/attachment-preview-cache"
import {
  chatMessageHasContent,
  chatMessageText,
  chatMessageThinking,
} from "@/lib/threads"
import type { AssistantGenerationStats } from "@/lib/threads"
import { cn } from "@/lib/utils"
import {
  chatRuntimeStore,
  useChatRuntimeStore,
} from "@/stores/chat-runtime-store"
import { useChatUiStore, useChatUiStoreApi } from "@/stores/AppStateProvider"
import { temporaryThreadsStore } from "@/stores/temporary-threads-store"
import {
  composerCanSend,
  getThreadComposerState,
  readyAttachmentIds,
} from "@/stores/chat-ui-store"
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
  // Effect Event: timeouts scheduled below must call the latest scrollToEnd
  // without re-arming when the scroller identity changes.
  const onScrollToEnd = useEffectEvent(() => {
    scrollToEnd({ behavior: "auto" })
  })

  useLayoutEffect(() => {
    if (!hasMessages) return

    const timeouts: number[] = []
    for (const delayMs of MESSAGE_SCROLLER_ENSURE_END.delaysMs) {
      timeouts.push(window.setTimeout(() => onScrollToEnd(), delayMs))
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
    <TimelineMinimap
      items={items}
      bottomInset={bottomInset}
      onSelect={onSelect}
    />
  )
})

/**
 * The memo boundary that matters. It owns the scroller wrapper too, so a chunk
 * costs one shallow compare per row instead of reconciling every message
 * subtree — memoizing further up can't help, because the message list is the
 * very prop that changes.
 */
const EMPTY_MESSAGE_ATTACHMENTS: Array<ThreadMessageAttachment> = []

const ChatMessageRow = memo(function ChatMessageRow({
  message,
  isStreaming,
  isScrollAnchor,
  isStopped,
  isTemporary,
  generationStats,
  attachments,
}: {
  message: UIMessage
  isStreaming: boolean
  isScrollAnchor: boolean
  isStopped: boolean
  isTemporary: boolean
  generationStats: AssistantGenerationStats | undefined
  attachments: Array<ThreadMessageAttachment>
}) {
  return (
    <MessageScrollerItem messageId={message.id} scrollAnchor={isScrollAnchor}>
      <ChatMessage
        message={message}
        isStreaming={isStreaming}
        isStopped={isStopped}
        isTemporary={isTemporary}
        generationStats={generationStats}
        attachments={attachments}
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
  emptyStateIsTemporary = false,
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
  emptyStateIsTemporary?: boolean
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
  const [ephemeralGenerationStats, setEphemeralGenerationStats] = useState<
    Record<string, AssistantGenerationStats>
  >(() => generationStats)
  const isTemporary = isTemporaryThreadId(threadId)
  const stopStreamingMessage = useMutation(api.chatRuns.stopFromClient)
  const threadAttachmentDocs = useQuery(
    api.attachments.listForThreadMessages,
    isAuthenticated && threadId !== "guest" && !isTemporary
      ? { threadId: asThreadId(threadId) }
      : "skip"
  )
  const [localAttachmentsByMessageId, setLocalAttachmentsByMessageId] =
    useState<Map<string, Array<ThreadMessageAttachment>>>(() => new Map())
  const attachmentIdsByMessageRef = useRef<Record<string, string[]>>({})
  const attachmentsByMessageId = useMemo(() => {
    const grouped = new Map<string, Array<ThreadMessageAttachment>>()
    for (const attachment of threadAttachmentDocs ?? []) {
      if (!attachment.messageId) continue
      const existing = grouped.get(attachment.messageId)
      const item = {
        attachmentId: attachment.attachmentId,
        messageId: attachment.messageId,
        filename: attachment.filename,
        kind: attachment.kind,
      }
      if (existing) existing.push(item)
      else grouped.set(attachment.messageId, [item])
    }
    for (const [messageId, attachments] of localAttachmentsByMessageId) {
      if (!grouped.has(messageId) && attachments.length > 0) {
        grouped.set(messageId, attachments)
      }
    }
    return grouped
  }, [localAttachmentsByMessageId, threadAttachmentDocs])
  // Do not subscribe to draft here — every keystroke would re-render the scroller.
  const hasDraft = useThreadComposerHasDraft(threadStateKey)
  const hasComposerAttachments = useChatUiStore(
    (state) =>
      getThreadComposerState(state, threadStateKey).attachments.length > 0
  )
  const reasoningEffort = useThreadComposerReasoningEffort(threadStateKey)
  const chatUi = useChatUiStoreApi()
  const setDraft = useChatUiStore((state) => state.setDraft)
  const clearDraft = useChatUiStore((state) => state.clearDraft)
  const clearAttachments = useChatUiStore((state) => state.clearAttachments)
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
  // Stable object mutated before each send so attachmentIds are current when
  // ChatClient spreads forwardedPropsOption at request time.
  const forwardedPropsRef = useRef({
    modelId: modelPreferences.selectedModelId,
    reasoningEffort: effectiveReasoningEffort,
    attachmentIds: new Array<string>(),
    ephemeral: isTemporary,
    attachmentsByMessageId: attachmentIdsByMessageRef.current,
  })
  forwardedPropsRef.current.modelId = modelPreferences.selectedModelId
  forwardedPropsRef.current.reasoningEffort = effectiveReasoningEffort
  forwardedPropsRef.current.ephemeral = isTemporary
  forwardedPropsRef.current.attachmentsByMessageId =
    attachmentIdsByMessageRef.current

  const { messages, sendMessage, stop, isLoading, error } = useChat({
    threadId,
    initialMessages,
    forwardedProps: forwardedPropsRef.current,
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
    !hasDraft &&
    !hasComposerAttachments
  const lastMessage = messages.at(-1)

  // Snapshot once the stream settles. Derived during render so a finished
  // assistant row has stats on the next paint without an effect.
  if (isTemporary && !isLoading) {
    const modelName =
      getChatModelById(selectedModelId)?.name ?? selectedModelId
    const mode = `${effectiveReasoningEffort.charAt(0).toUpperCase()}${effectiveReasoningEffort.slice(1)}`
    let nextStats: Record<string, AssistantGenerationStats> | null = null
    for (const message of messages) {
      if (message.role !== "assistant") continue
      if (ephemeralGenerationStats[message.id]) continue
      if (!chatMessageHasContent(message)) continue
      nextStats ??= { ...ephemeralGenerationStats }
      nextStats[message.id] = estimateTemporaryGenerationStats({
        text: chatMessageText(message),
        thinking: chatMessageThinking(message),
        modelName,
        mode,
      })
    }
    if (nextStats) setEphemeralGenerationStats(nextStats)
  }

  const resolvedGenerationStats = isTemporary
    ? ephemeralGenerationStats
    : generationStats

  // During the draft→thread handoff the real user message isn't dispatched until
  // after navigation, so paint an optimistic bubble from the in-flight text.
  // Reusing the pending message id lets the real message replace it in place
  // (same key) instead of appearing above the dots and pushing them down.
  const optimisticUserContent =
    isEmptyThread && (activeTurn || hasPendingSubmission)
      ? activeTurnContent || pendingSubmission?.content || ""
      : ""
  const optimisticAttachmentCount =
    isEmptyThread && (activeTurn || hasPendingSubmission)
      ? (pendingSubmission?.attachmentIds.length ??
        getThreadComposerState(chatUi.getState(), threadStateKey).attachments
          .length)
      : 0
  const optimisticUserMessage = useMemo<UIMessage | null>(() => {
    if (!optimisticUserContent && optimisticAttachmentCount === 0) return null
    return {
      id: pendingSubmission?.messageId ?? "optimistic-user",
      role: "user",
      parts: [
        {
          type: "text" as const,
          content: optimisticUserContent || "",
        },
      ],
      createdAt: new Date(),
    }
  }, [
    optimisticAttachmentCount,
    optimisticUserContent,
    pendingSubmission?.messageId,
  ])
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
  const minimapItems = useMemo(
    () => deriveTimelineMinimapItems(messages),
    // Mid-stream text growth must not rebuild the minimap; revision ignores it.
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed by minimapRevision
    [minimapRevision]
  )

  // Only the trailing assistant message changes mid-stream, so hold the rows
  // above it at the snapshot taken when the turn started. They then sit outside
  // the streaming render pass instead of being rebuilt on every chunk.
  // Render-time ref freeze is intentional — effect-sync remounts history mid-stream.
  const streamingMessage =
    isLoading && lastMessage?.role === "assistant" ? lastMessage : null
  const historySource = streamingMessage
    ? displayMessages.slice(0, -1)
    : displayMessages
  const historyRef = useRef(historySource)
  historyRef.current = resolveFrozenStreamingHistory(
    historyRef.current,
    historySource,
    streamingMessage !== null
  )
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
          isTemporary={isTemporary}
          generationStats={resolvedGenerationStats[message.id]}
          attachments={sentAttachmentsForMessage(
            message.id,
            attachmentsByMessageId.get(message.id) ?? EMPTY_MESSAGE_ATTACHMENTS,
            latestUserMessageId
          )}
        />
      )),
    [
      attachmentsByMessageId,
      resolvedGenerationStats,
      history,
      isTemporary,
      latestUserMessageId,
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
            isTemporary={isTemporary}
            generationStats={undefined}
            attachments={
              attachmentsByMessageId.get(renderedStreamingMessage.id) ??
              EMPTY_MESSAGE_ATTACHMENTS
            }
          />,
        ]
      : historyRows

  function recordMessageAttachments(
    messageId: string,
    attachmentIds: string[],
    composerAttachments: ReturnType<
      typeof getThreadComposerState
    >["attachments"]
  ) {
    if (attachmentIds.length === 0) return
    attachmentIdsByMessageRef.current[messageId] = attachmentIds
    forwardedPropsRef.current.attachmentsByMessageId =
      attachmentIdsByMessageRef.current
    const items =
      composerAttachments.length > 0
        ? rememberComposerPreviews(composerAttachments).map((attachment) => ({
            ...attachment,
            messageId,
          }))
        : sentAttachmentsForMessage(
            messageId,
            EMPTY_MESSAGE_ATTACHMENTS,
            messageId
          )
    if (items.length === 0) return
    setLocalAttachmentsByMessageId((current) => {
      const next = new Map(current)
      next.set(messageId, items)
      return next
    })
  }

  function submitMessage(content?: string) {
    const composer = getThreadComposerState(chatUi.getState(), threadStateKey)
    const text = content ?? composer.draft.trim()
    const attachmentIds = readyAttachmentIds(composer)
    if (!isReady || isLoading) return
    if (!composerCanSend({ ...composer, draft: text })) return
    if (!isAuthenticated) {
      onRequireAuthentication()
      return
    }

    forwardedPropsRef.current.attachmentIds = attachmentIds
    const messageId = crypto.randomUUID()
    recordMessageAttachments(messageId, attachmentIds, composer.attachments)
    rememberComposerPreviews(composer.attachments)
    clearDraft(threadStateKey)
    clearAttachments(threadStateKey, { revoke: false })
    setWorkStartedAt(Date.now())
    void sendMessage({
      id: messageId,
      content: text
        ? [{ type: "text", content: text }]
        : [{ type: "text", content: "" }],
    }).then(
      () => {
        forwardedPropsRef.current.attachmentIds = []
      },
      () => {
        forwardedPropsRef.current.attachmentIds = attachmentIds
      }
    )
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
    if (streamingMessage && isAuthenticated && !isTemporary) {
      void stopStreamingMessage({
        threadId: asThreadId(threadId),
        assistantMessageId: streamingMessage.id,
        content: chatMessageText(streamingMessage),
        thinking: chatMessageThinking(streamingMessage) || undefined,
      }).catch(() => undefined) // The run's own stop still closes it out.
    }

    stop()
  }

  // Latest-ref for store actions: bind once per threadId, always call current
  // submit/stop/flush. Do not move to useEffect — that reintroduces staleness.
  const submitMessageRef = useRef(submitMessage)
  submitMessageRef.current = submitMessage

  const stopGenerationRef = useRef(stopGeneration)
  stopGenerationRef.current = stopGeneration

  const flushPendingSubmissionRef = useRef(() => {})
  flushPendingSubmissionRef.current = () => {
    if (!isReady || !isAuthenticated) return
    const pending = takePendingSubmission(threadId)
    if (!pending) return

    forwardedPropsRef.current.attachmentIds = pending.attachmentIds
    recordMessageAttachments(
      pending.messageId,
      pending.attachmentIds,
      getThreadComposerState(chatUi.getState(), threadStateKey).attachments
    )
    clearAttachments(threadStateKey, { revoke: false })
    setWorkStartedAt(Date.now())
    void sendMessage({
      id: pending.messageId,
      content: pending.content
        ? [{ type: "text", content: pending.content }]
        : [{ type: "text", content: "" }],
    }).then(
      () => {
        forwardedPropsRef.current.attachmentIds = []
      },
      () => {
        forwardedPropsRef.current.attachmentIds = pending.attachmentIds
      }
    )
  }

  useLayoutEffect(() => {
    return chatRuntimeStore.getState().bindActions({
      submit: () => submitMessageRef.current(),
      stop: () => stopGenerationRef.current(),
    })
  }, [threadId])

  const persistableMessagesRef = useRef(() =>
    toPersistableTemporaryMessages([], {}, new Set())
  )
  persistableMessagesRef.current = () =>
    toPersistableTemporaryMessages(
      messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: chatMessageText(message),
        thinking: chatMessageThinking(message),
        createdAt:
          "createdAt" in message && message.createdAt instanceof Date
            ? message.createdAt.getTime()
            : Date.now(),
      })),
      attachmentIdsByMessageRef.current,
      new Set([...stoppedMessageIds, ...locallyStoppedMessageIds])
    )

  useLayoutEffect(() => {
    return chatRuntimeStore
      .getState()
      .bindPersistableMessages(() => persistableMessagesRef.current())
  }, [threadId])

  // External localStorage snapshot. Cannot run during render: the sidebar
  // subscribes to this store and would update while this view is rendering.
  useLayoutEffect(() => {
    if (!isTemporary || messages.length === 0) return
    if (isLoading && lastMessage?.role !== "user") return
    temporaryThreadsStore.getState().upsertLiveTranscript(threadId, {
      messages: persistableMessagesRef.current(),
      generationStats: resolvedGenerationStats,
      stoppedMessageIds: [...stoppedMessageIds, ...locallyStoppedMessageIds],
    })
  }, [
    isLoading,
    isTemporary,
    lastMessage?.role,
    locallyStoppedMessageIds,
    messages,
    resolvedGenerationStats,
    stoppedMessageIds,
    threadId,
  ])

  // Draft submit queues a pending message then navigates here and requests a
  // flush. Registering the flusher (instead of sending on mount) keeps the
  // handoff event-driven: only the surviving ready view sends, once.
  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return
    return chatRuntimeStore
      .getState()
      .registerPendingFlusher(threadId, () =>
        flushPendingSubmissionRef.current()
      )
  }, [threadId, isReady, isAuthenticated])

  useLayoutEffect(() => {
    chatRuntimeStore.getState().setPanelState({
      isLoading,
      error: error ?? null,
      isReady,
      isEmptyThread,
      effectiveReasoningEffort,
      supportedReasoningEfforts: modelPreferences.isLoading
        ? []
        : modelConfig.supportedReasoningEfforts,
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
                isTemporary={emptyStateIsTemporary}
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
