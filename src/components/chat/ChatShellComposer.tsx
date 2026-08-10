import { useLayoutEffect, useRef } from "react"

import { useShallow } from "zustand/react/shallow"

import { ChatComposer } from "@/components/chat/composer/ChatComposer"
import { useThreadComposerControls } from "@/hooks/useThreadComposerState"
import { useChatUiStore } from "@/stores/AppStateProvider"
import { useChatRuntimeStore } from "@/stores/chat-runtime-store"

type ChatShellComposerProps = {
  threadStateKey: string
  isDraft: boolean
  isAuthenticated: boolean
  canSubmit: boolean
  onDraftSubmit: (content: string) => void
  onRequireAuthentication: () => void
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
  const composer = useThreadComposerControls(threadStateKey)
  const clearDraft = useChatUiStore((state) => state.clearDraft)
  const {
    isLoading,
    activeTurn,
    error,
    isReady,
    isEmptyThread,
    effectiveReasoningEffort,
    supportedReasoningEfforts,
    modelLoading,
    submit,
    stop,
    setActiveTurn,
    setPanelState,
  } = useChatRuntimeStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
      activeTurn: state.activeTurn,
      error: state.error,
      isReady: state.isReady,
      isEmptyThread: state.isEmptyThread,
      effectiveReasoningEffort: state.effectiveReasoningEffort,
      supportedReasoningEfforts: state.supportedReasoningEfforts,
      modelLoading: state.modelLoading,
      submit: state.submit,
      stop: state.stop,
      setActiveTurn: state.setActiveTurn,
      setPanelState: state.setPanelState,
    }))
  )

  // Treat the button as "sending" the moment a turn is dispatched. The real
  // isLoading briefly falls back to false while the thread is created and the
  // route swaps; activeTurn covers that window so the icon never flips back.
  const isBusy = isLoading || activeTurn

  useLayoutEffect(() => {
    const element = composerOverlayRef.current
    if (!element) return

    const updateHeight = () => {
      setPanelState({
        composerHeight: Math.ceil(element.getBoundingClientRect().height),
      })
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
  }, [setPanelState])

  function handleSubmit() {
    const content = composer.draft.trim()
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
            disabled={modelLoading}
            placeholder={
              isEmptyThread
                ? "Type your message here..."
                : "Ask for follow-up changes..."
            }
          />
        </div>
      </div>
    </div>
  )
}
