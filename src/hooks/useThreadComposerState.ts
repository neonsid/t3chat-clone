import { useShallow } from "zustand/react/shallow"

import { useChatUiStore } from "@/stores/AppStateProvider"
import { getThreadComposerState } from "@/stores/chat-ui-store"

export function useThreadSubmissionState(threadStateKey: string) {
  return useChatUiStore(
    useShallow((state) => {
      const composer = getThreadComposerState(state, threadStateKey)
      return {
        draft: composer.draft,
        reasoningEffort: composer.reasoningEffort,
        setDraft: state.setDraft,
        clearDraft: state.clearDraft,
      }
    })
  )
}

/** Full composer slice — prefer narrower hooks when draft keystrokes must not fan out. */
export function useThreadComposerControls(threadStateKey: string) {
  return useChatUiStore(
    useShallow((state) => {
      const composer = getThreadComposerState(state, threadStateKey)
      return {
        draft: composer.draft,
        reasoningEffort: composer.reasoningEffort,
        searchEnabled: composer.searchEnabled,
        setDraft: state.setDraft,
        setReasoningEffort: state.setReasoningEffort,
        setSearchEnabled: state.setSearchEnabled,
      }
    })
  )
}

/** Toolbar-only: intentionally omits draft so typing does not re-render chrome. */
export function useThreadComposerToolbarControls(threadStateKey: string) {
  return useChatUiStore(
    useShallow((state) => {
      const composer = getThreadComposerState(state, threadStateKey)
      return {
        searchEnabled: composer.searchEnabled,
        setReasoningEffort: state.setReasoningEffort,
        setSearchEnabled: state.setSearchEnabled,
      }
    })
  )
}

export function useThreadComposerDraft(threadStateKey: string) {
  return useChatUiStore(
    (state) => getThreadComposerState(state, threadStateKey).draft
  )
}

export function useThreadComposerHasDraft(threadStateKey: string) {
  return useChatUiStore(
    (state) =>
      getThreadComposerState(state, threadStateKey).draft.trim().length > 0
  )
}

export function useThreadComposerReasoningEffort(threadStateKey: string) {
  return useChatUiStore(
    (state) => getThreadComposerState(state, threadStateKey).reasoningEffort
  )
}
