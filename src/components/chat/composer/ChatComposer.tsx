import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react"
import {
  ArrowUpIcon,
  CheckIcon,
  GlobeIcon,
  MinusIcon,
  PaperclipIcon,
  PlusIcon,
  SquareIcon,
} from "lucide-react"

import { ModelPicker } from "@/components/chat/model-picker/ModelPicker"
import {
  ATTACHMENT_UPLOAD_TOAST,
  ATTACHMENT_UPLOAD_TOAST_ID,
} from "@/components/chat/attachments/constants"
import { ComposerAttachmentChips } from "@/components/chat/composer/ComposerAttachmentChips"
import { ComposerUsageButton } from "@/components/chat/composer/ComposerUsageButton"
import { ReasoningEffortSelect } from "@/components/chat/composer/ReasoningEffortSelect"
import {
  CHAT_COMPOSER_PLACEHOLDERS,
  SEARCH_TOGGLE,
} from "@/components/chat/composer/constants"
import type { ComposerUsageStripData } from "@/hooks/useComposerUsage"
import { webSearchTooltip } from "@/components/chat/composer/logic"
import { showShellToast } from "@/components/chat/shell/shell-toast"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { useComposerAttachments } from "@/hooks/useComposerAttachments"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import {
  useThreadComposerCanSend,
  useThreadComposerDraft,
  useThreadComposerToolbarControls,
} from "@/hooks/useThreadComposerState"
import {
  ATTACHMENT_ACCEPT,
  DOCX_MIME_TYPE,
  MAX_ATTACHMENTS_PER_MESSAGE,
  TXT_MIME_TYPE,
  normalizeAttachmentMimeType,
} from "@/lib/attachment-limits"
import { filesFromClipboard } from "@/lib/clipboard-files"
import {
  createPastedTextFile,
  shouldAttachPastedText,
} from "@/lib/pasted-text-attachment"
import { useChatUiStore } from "@/stores/AppStateProvider"
import { CHAT_MODEL_CONFIG, isChatModelId } from "@/lib/chat-models"
import type { ReasoningEffort } from "@/lib/chat-models"
import {
  modelSupportsWebSearch,
  stepSearchLimit,
  WEB_SEARCH_LIMIT,
} from "@/lib/web-search"
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
  // Latest-ref: stable onSubmit for ComposerDraftField without stale closures.
  // Prefer this over useEffectEvent here — Effect Events must not be child props.
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit
  const submit = useCallback(() => {
    onSubmitRef.current()
  }, [])

  const { attachments, addFiles, removeAttachment } =
    useComposerAttachments(threadStateKey, contextGate)
  const uploadToastActive = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  async function handleFilesSelected(files: FileList | File[] | null) {
    if (!files || files.length === 0) return

    const fileCount = Array.from(files).filter((file) => {
      const mime = normalizeAttachmentMimeType(file)
      return (
        mime === "application/pdf" ||
        mime === DOCX_MIME_TYPE ||
        mime === TXT_MIME_TYPE
      )
    }).length

    await addFiles(files, {
      onBatchStart: () => {
        if (fileCount === 0) return
        uploadToastActive.current = true
        showShellToast({
          id: ATTACHMENT_UPLOAD_TOAST_ID,
          title: ATTACHMENT_UPLOAD_TOAST.uploading(fileCount),
          status: "loading",
          duration: 0,
        })
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

  const busyUploading = attachments.some(
    (attachment) =>
      attachment.status === "preparing" ||
      attachment.status === "uploading" ||
      attachment.status === "processing"
  )
  const allSettled =
    attachments.length > 0 &&
    attachments.every(
      (attachment) =>
        attachment.status === "ready" || attachment.status === "failed"
    )

  // Page toast is outside this tree, so settlement has to be pushed into it.
  useEffect(() => {
    if (!uploadToastActive.current || busyUploading || !allSettled) return
    uploadToastActive.current = false
    const failedCount = attachments.filter(
      (attachment) => attachment.status === "failed"
    ).length
    showShellToast({
      id: ATTACHMENT_UPLOAD_TOAST_ID,
      title:
        failedCount === 0
          ? ATTACHMENT_UPLOAD_TOAST.ready
          : attachments.length === 1
            ? ATTACHMENT_UPLOAD_TOAST.failed
            : ATTACHMENT_UPLOAD_TOAST.someFailed,
      status: failedCount > 0 ? "error" : "success",
      duration: 2800,
    })
  }, [allSettled, attachments, busyUploading])

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

const ComposerToolbar = memo(function ComposerToolbar({
  threadStateKey,
  effectiveReasoningEffort,
  supportedReasoningEfforts,
  usage,
  isLoading,
  disabled,
  onStop,
  onAttachClick,
  attachDisabled,
}: {
  threadStateKey: string
  effectiveReasoningEffort: ReasoningEffort
  supportedReasoningEfforts: ReadonlyArray<ReasoningEffort>
  usage?: ComposerUsageStripData
  isLoading: boolean
  disabled: boolean
  onStop?: () => void
  onAttachClick: () => void
  attachDisabled: boolean
}) {
  const composer = useThreadComposerToolbarControls(threadStateKey)
  const { isLoading: modelPreferencesLoading, selectedModelId } =
    useModelPreferences()
  const searchSupported = modelSupportsWebSearch(selectedModelId)
  const searchDisabled = modelPreferencesLoading || disabled || !searchSupported

  return (
    <div className="flex min-w-0 items-center px-3 pb-7 sm:px-4 sm:pb-8">
      <div className="flex min-w-0 items-center gap-2">
        <ModelPicker
          onSelectModel={(modelId) => {
            if (!isChatModelId(modelId)) return
            composer.setReasoningEffort(
              threadStateKey,
              CHAT_MODEL_CONFIG[modelId].defaultReasoningEffort
            )
          }}
        />

        {!modelPreferencesLoading && supportedReasoningEfforts.length > 1 ? (
          <ReasoningEffortSelect
            value={effectiveReasoningEffort}
            supportedEfforts={supportedReasoningEfforts}
            onValueChange={(reasoningEffort) =>
              composer.setReasoningEffort(threadStateKey, reasoningEffort)
            }
            disabled={disabled || isLoading}
          />
        ) : null}

        <div className="flex min-w-0 [scrollbar-width:none] items-center justify-start gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <SearchToggle
            pressed={composer.searchEnabled}
            searchLimit={composer.searchLimit}
            supported={searchSupported}
            disabled={searchDisabled}
            onPressedChange={(searchEnabled) =>
              composer.setSearchEnabled(threadStateKey, searchEnabled)
            }
            onSearchLimitChange={(searchLimit) =>
              composer.setSearchLimit(threadStateKey, searchLimit)
            }
          />
          <Tooltip content="Attach files">
            <span
              className={cn(
                "inline-flex",
                (attachDisabled || modelPreferencesLoading) &&
                  "cursor-not-allowed"
              )}
            >
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border/70 bg-transparent px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                aria-label="Attach"
                disabled={attachDisabled || modelPreferencesLoading}
                onClick={onAttachClick}
              >
                <PaperclipIcon className="size-3.5" />
                Attach
              </button>
            </span>
          </Tooltip>
          <ComposerUsageButton usage={usage} />
        </div>
      </div>

      <div className="ml-auto flex items-center">
        <ComposerSendButton
          threadStateKey={threadStateKey}
          isLoading={isLoading}
          disabled={disabled}
          onStop={onStop}
        />
      </div>
    </div>
  )
})

const ComposerSendButton = memo(function ComposerSendButton({
  threadStateKey,
  isLoading,
  disabled,
  onStop,
}: {
  threadStateKey: string
  isLoading: boolean
  disabled: boolean
  onStop?: () => void
}) {
  const canSend = useThreadComposerCanSend(threadStateKey, {
    isLoading,
    disabled,
  })
  // Stay on primary stop styling while busy even if stop isn't rebound yet
  // (draft→thread remount) or messagesLoading disabled the rest of the form.
  // Upload busy must not become stop — only generation isLoading flips stop.
  const isActionDisabled = isLoading ? false : !canSend
  const actionTooltip = isLoading
    ? "Stop generating"
    : canSend
      ? "Send message"
      : "Add a message or ready attachment"

  return (
    <Tooltip content={actionTooltip}>
      <span
        className={cn("inline-flex", isActionDisabled && "cursor-not-allowed")}
      >
        <button
          type={isLoading ? "button" : "submit"}
          aria-label={isLoading ? "Stop generating" : "Send message"}
          disabled={isActionDisabled}
          onClick={isLoading ? () => onStop?.() : undefined}
          className={cn(
            "relative isolate flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border transition-[color,background-color,opacity,transform,box-shadow] duration-150 active:scale-95 enabled:cursor-pointer disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100",
            isActionDisabled
              ? "border-border bg-card text-muted-foreground"
              : "border-transparent bg-primary text-primary-foreground shadow-xs shadow-black/5 enabled:hover:scale-105 enabled:hover:bg-[var(--primary-hover)] enabled:active:bg-[var(--primary-focus)]"
          )}
        >
          {isLoading ? (
            <SquareIcon className="size-5 fill-current" />
          ) : (
            <ArrowUpIcon className="size-5" />
          )}
        </button>
      </span>
    </Tooltip>
  )
})

function SearchToggle({
  pressed,
  searchLimit,
  supported,
  disabled,
  onPressedChange,
  onSearchLimitChange,
}: {
  pressed: boolean
  searchLimit: number
  supported: boolean
  disabled: boolean
  onPressedChange: (next: boolean) => void
  onSearchLimitChange: (searchLimit: number) => void
}) {
  const [editingLimit, setEditingLimit] = useState(false)
  const showLimit = pressed && supported
  if (!showLimit && editingLimit) setEditingLimit(false)

  const changeLimit = (delta: number) => {
    onSearchLimitChange(stepSearchLimit(searchLimit, delta))
  }

  if (showLimit && editingLimit) {
    return (
      <span className={cn("inline-flex", disabled && "cursor-not-allowed")}>
        <div
          role="group"
          tabIndex={0}
          autoFocus
          aria-label={SEARCH_TOGGLE.limitEditorLabel}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Escape") {
              event.preventDefault()
              event.stopPropagation()
              setEditingLimit(false)
              return
            }
            if (event.key === "ArrowLeft" || event.key === "-") {
              event.preventDefault()
              changeLimit(-1)
              return
            }
            if (event.key === "ArrowRight" || event.key === "+") {
              event.preventDefault()
              changeLimit(1)
            }
          }}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-sm",
            SEARCH_TOGGLE.activeClass,
            disabled && "opacity-50"
          )}
        >
          <button
            type="button"
            aria-label={SEARCH_TOGGLE.decreaseLimit}
            disabled={disabled || searchLimit <= WEB_SEARCH_LIMIT.min}
            onClick={() => changeLimit(-1)}
            className={SEARCH_TOGGLE.editorButtonClass}
          >
            <MinusIcon className="size-3.5" />
          </button>
          <span className="min-w-5 text-center tabular-nums">{searchLimit}</span>
          <button
            type="button"
            aria-label={SEARCH_TOGGLE.increaseLimit}
            disabled={disabled || searchLimit >= WEB_SEARCH_LIMIT.max}
            onClick={() => changeLimit(1)}
            className={SEARCH_TOGGLE.editorButtonClass}
          >
            <PlusIcon className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={SEARCH_TOGGLE.confirmLimit}
            disabled={disabled}
            onClick={() => setEditingLimit(false)}
            className={SEARCH_TOGGLE.editorButtonClass}
          >
            <CheckIcon className="size-3.5" />
          </button>
        </div>
      </span>
    )
  }

  return (
    <Tooltip content={webSearchTooltip(supported, pressed)}>
      <span className={cn("inline-flex", disabled && "cursor-not-allowed")}>
        <div
          className={cn(
            "inline-flex items-center overflow-hidden rounded-full border text-sm transition-colors",
            pressed ? SEARCH_TOGGLE.activeClass : SEARCH_TOGGLE.idleClass,
            disabled && "opacity-50"
          )}
        >
          <button
            type="button"
            aria-pressed={pressed}
            disabled={disabled}
            onClick={() => onPressedChange(!pressed)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-sm disabled:pointer-events-none",
              showLimit ? "ps-2.5 pe-1.5" : "px-2.5"
            )}
          >
            <GlobeIcon className="size-3.5" />
            {SEARCH_TOGGLE.label}
          </button>
          {showLimit ? (
            <>
              <span
                aria-hidden="true"
                className="h-3 w-px bg-primary-foreground/30"
              />
              <button
                type="button"
                disabled={disabled}
                aria-label={`${SEARCH_TOGGLE.limitEditorLabel} ${searchLimit}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setEditingLimit(true)
                }}
                className="cursor-pointer px-2 py-1.5 text-sm tabular-nums disabled:pointer-events-none"
              >
                {searchLimit}x
              </button>
            </>
          ) : null}
        </div>
      </span>
    </Tooltip>
  )
}
