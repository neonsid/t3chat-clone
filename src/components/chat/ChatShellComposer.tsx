import { useCallback, useLayoutEffect, useRef } from "react"

import { useShallow } from "zustand/react/shallow"

import { ChatComposer } from "@/components/chat/composer/ChatComposer"
import {
  CHAT_COMPOSER_OVERLAY_HEIGHT,
  CHAT_COMPOSER_PLACEHOLDERS,
} from "@/components/chat/composer/constants"
import { useChatUiStore, useChatUiStoreApi } from "@/stores/AppStateProvider"
import { getThreadComposerState } from "@/stores/chat-ui-store"
import { useChatRuntimeStore } from "@/stores/chat-runtime-store"

type ChatShellComposerProps = {
  threadStateKey: string
  isDraft: boolean
  isAuthenticated: boolean
  canSubmit: boolean
  onDraftSubmit: (content: string) => void
  onRequireAuthentication: () => void
}

function publishComposerOverlayHeight(overlay: HTMLElement, heightPx: number) {
  const shell = overlay.closest("[data-chat-shell]")
  if (!(shell instanceof HTMLElement)) return
  shell.style.setProperty(
    CHAT_COMPOSER_OVERLAY_HEIGHT.cssVar,
    `${heightPx}px`
  )
}

export function ChatShellComposer({
  threadStateKey,
  isDraft,
  isAuthenticated,
  canSubmit,
  onDraftSubmit,
  onRequireAuthentication,
}: ChatShellComposerProps) {
  const composerOverlayRef = useRef<HTMLDivElement | null>(null)
  const chatUi = useChatUiStoreApi()
  const clearDraft = useChatUiStore((state) => state.clearDraft)
  const {
    isLoading,
    activeTurn,
    error,
    isReady,
    isEmptyThread,
    messagesLoading,
    effectiveReasoningEffort,
    supportedReasoningEfforts,
    modelLoading,
    submit,
    stop,
    setActiveTurn,
  } = useChatRuntimeStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
      activeTurn: state.activeTurn,
      error: state.error,
      isReady: state.isReady,
      isEmptyThread: state.isEmptyThread,
      messagesLoading: state.messagesLoading,
      effectiveReasoningEffort: state.effectiveReasoningEffort,
      supportedReasoningEfforts: state.supportedReasoningEfforts,
      modelLoading: state.modelLoading,
      submit: state.submit,
      stop: state.stop,
      setActiveTurn: state.setActiveTurn,
    }))
  )

  // Treat the button as "sending" the moment a turn is dispatched. The real
  // isLoading briefly falls back to false while the thread is created and the
  // route swaps; activeTurn covers that window so the icon never flips back.
  const isBusy = isLoading || activeTurn
  // Handoff (and in-flight turns) can still see messages===undefined for a beat;
  // don't treat that as a normal conversation load or the placeholder/send flash.
  const blockOnMessagesLoad = messagesLoading && !isBusy

  // Height goes to a CSS var on the shell — not React state — so textarea growth
  // does not re-render ChatThreadView / the message scroller.
  useLayoutEffect(() => {
    const element = composerOverlayRef.current
    if (!element) return

    let lastHeight = -1
    const updateHeight = () => {
      const height = Math.ceil(element.getBoundingClientRect().height)
      if (height === lastHeight) return
      lastHeight = height
      publishComposerOverlayHeight(element, height)
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
  }, [])

  // Latest-ref behind stable callback: always submit with current draft/auth/busy.
  // Do not sync via useEffect — that reintroduces stale handlers.
  const handleSubmitRef = useRef(() => {})
  handleSubmitRef.current = () => {
    const content = getThreadComposerState(
      chatUi.getState(),
      threadStateKey
    ).draft.trim()
    if (!content || isBusy) return

    if (!isAuthenticated) {
      onRequireAuthentication()
      return
    }

    if (isDraft) {
      if (!canSubmit) return
      setActiveTurn(true, content)
      clearDraft(threadStateKey)
      onDraftSubmit(content)
      return
    }

    if (!isReady) return
    setActiveTurn(true, content)
    submit?.()
  }
  const handleSubmit = useCallback(() => {
    handleSubmitRef.current()
  }, [])

  return (
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
            threadStateKey={threadStateKey}
            effectiveReasoningEffort={effectiveReasoningEffort}
            supportedReasoningEfforts={supportedReasoningEfforts}
            onSubmit={handleSubmit}
            onStop={stop ?? undefined}
            isLoading={isBusy}
            disabled={modelLoading || blockOnMessagesLoad}
            placeholder={
              blockOnMessagesLoad
                ? CHAT_COMPOSER_PLACEHOLDERS.loadingConversation
                : isEmptyThread
                  ? CHAT_COMPOSER_PLACEHOLDERS.newThread
                  : CHAT_COMPOSER_PLACEHOLDERS.followUp
            }
          />
        </div>
      </div>
    </div>
  )
}
