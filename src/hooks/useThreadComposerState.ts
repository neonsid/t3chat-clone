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
