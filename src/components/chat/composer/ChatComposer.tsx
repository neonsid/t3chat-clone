import { memo, useCallback, useRef } from "react"
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react"

import {
  ATTACHMENT_UPLOAD_TOAST,
  ATTACHMENT_UPLOAD_TOAST_ID,
} from "@/components/chat/attachments/constants"
import { ComposerAttachmentChips } from "@/components/chat/composer/ComposerAttachmentChips"
import { ComposerToolbar } from "@/components/chat/composer/ComposerToolbar"
import { useComposerUploadToast } from "@/components/chat/composer/useComposerUploadToast"
import { CHAT_COMPOSER_PLACEHOLDERS } from "@/components/chat/composer/constants"
import type { ComposerUsageStripData } from "@/hooks/useComposerUsage"
import { showShellToast } from "@/components/chat/shell/shell-toast"
import { useComposerAttachments } from "@/hooks/useComposerAttachments"
import {
  useThreadComposerCanSend,
  useThreadComposerDraft,
} from "@/hooks/useThreadComposerState"
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/attachment-limits"
import { filesFromClipboard } from "@/lib/clipboard-files"
import {
  createPastedTextFile,
  shouldAttachPastedText,
} from "@/lib/pasted-text-attachment"
import { useChatUiStore } from "@/stores/AppStateProvider"
import type { ReasoningEffort } from "@/lib/chat-models"
import { cn } from "@/lib/utils"

interface ChatComposerProps {
  threadStateKey: string
  onSubmit: () => void
  effectiveReasoningEffort: ReasoningEffort
  supportedReasoningEfforts: ReadonlyArray<ReasoningEffort>
  onStop?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  usage?: ComposerUsageStripData
  contextGate?: {
    threadTokensWithoutComposerDocx: number
    inputBudget: number | null
    modelName: string
  }
}

export const ChatComposer = memo(function ChatComposer({
  threadStateKey,
  onSubmit,
  effectiveReasoningEffort,
  supportedReasoningEfforts,
  onStop,
  isLoading = false,
  disabled = false,
  placeholder = CHAT_COMPOSER_PLACEHOLDERS.newThread,
  className,
  usage,
  contextGate,
}: ChatComposerProps) {
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit
  const submit = useCallback(() => {
    onSubmitRef.current()
  }, [])

  const { attachments, addFiles, removeAttachment } = useComposerAttachments(
    threadStateKey,
    contextGate
  )
  const { markBatchStarted } = useComposerUploadToast(attachments)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  async function handleFilesSelected(files: FileList | File[] | null) {
    if (!files || files.length === 0) return

    await addFiles(files, {
      onBatchStart: () => {
        markBatchStarted(files)
      },
      onRejected: (message) => {
        showShellToast({
          id: ATTACHMENT_UPLOAD_TOAST_ID,
          title: message,
          status: "error",
          duration: 3600,
        })
      },
    })
  }

  function handleDraftPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    if (disabled || isLoading) return
    const clipboard = event.clipboardData
    if (!clipboard) return

    const files = filesFromClipboard(clipboard)
    if (files.length > 0) {
      event.preventDefault()
      void handleFilesSelected(files)
      return
    }

    const pasted = clipboard.getData("text/plain")
    if (!shouldAttachPastedText(pasted)) return
    if (attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE) return
    event.preventDefault()
    void handleFilesSelected([
      createPastedTextFile(
        pasted,
        attachments.map((attachment) => attachment.filename)
      ),
    ])
  }

  return (
    <div
      className={cn(
        "chat-composer-glass-shell relative mx-auto w-full max-w-3xl",
        className
      )}
    >
      <div className="chat-composer-glass-host relative z-10 w-full overflow-visible rounded-[18px]">
        <form
          className="mx-auto w-full max-w-3xl min-w-0"
          data-chat-composer-form="true"
          onSubmit={handleSubmit}
        >
          <div className="px-4 pt-3 sm:px-5 sm:pt-4">
            <ComposerAttachmentChips
              attachments={attachments}
              disabled={disabled || isLoading}
              onRemove={(localId) => {
                const removed = attachments.find(
                  (attachment) => attachment.localId === localId
                )
                void removeAttachment(localId)
                if (removed?.status === "ready") {
                  showShellToast({
                    id: ATTACHMENT_UPLOAD_TOAST_ID,
                    title: ATTACHMENT_UPLOAD_TOAST.deleted,
                    status: "success",
                    duration: 2800,
                  })
                }
              }}
            />
            <ComposerDraftField
              threadStateKey={threadStateKey}
              disabled={disabled || isLoading}
              placeholder={placeholder}
              onSubmit={submit}
              onPaste={handleDraftPaste}
              canSubmit={!isLoading && !disabled}
            />
          </div>

          <ComposerToolbar
            threadStateKey={threadStateKey}
            effectiveReasoningEffort={effectiveReasoningEffort}
            supportedReasoningEfforts={supportedReasoningEfforts}
            usage={usage}
            isLoading={isLoading}
            disabled={disabled}
            onStop={onStop}
            onAttachClick={() => fileInputRef.current?.click()}
            attachDisabled={disabled || isLoading}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            multiple
            className="sr-only"
            onChange={(event) => {
              void handleFilesSelected(event.target.files)
              event.target.value = ""
            }}
          />
        </form>
      </div>
    </div>
  )
})

function ComposerDraftField({
  threadStateKey,
  disabled,
  placeholder,
  onSubmit,
  onPaste,
  canSubmit,
}: {
  threadStateKey: string
  disabled: boolean
  placeholder: string
  onSubmit: () => void
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void
  canSubmit: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const draft = useThreadComposerDraft(threadStateKey)
  const setDraft = useChatUiStore((state) => state.setDraft)
  const canSend = useThreadComposerCanSend(threadStateKey, {
    isLoading: !canSubmit,
    disabled,
  })

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (!canSend) return
      onSubmit()
    }
  }

  return (
    <textarea
      ref={textareaRef}
      data-chat-composer-input="true"
      aria-label="Message"
      className="field-sizing-content max-h-50 min-h-12 w-full resize-none bg-transparent text-[15px] leading-6 text-foreground outline-none placeholder:text-[var(--placeholder,var(--muted-foreground))] disabled:opacity-60"
      disabled={disabled}
      onChange={(event) => setDraft(threadStateKey, event.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={onPaste}
      placeholder={placeholder}
      rows={1}
      value={draft}
    />
  )
}
