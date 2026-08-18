import { memo, useCallback, useEffect, useRef } from "react"
import type { FormEvent, KeyboardEvent, ReactNode } from "react"
import { ArrowUpIcon, GlobeIcon, PaperclipIcon, SquareIcon } from "lucide-react"

import { ModelPicker } from "@/components/chat/model-picker/ModelPicker"
import {
  ATTACHMENT_UPLOAD_TOAST,
  ATTACHMENT_UPLOAD_TOAST_GAP_FROM_ATTACH,
  ATTACHMENT_UPLOAD_TOAST_ID,
} from "@/components/chat/attachments/constants"
import { ComposerAttachmentChips } from "@/components/chat/composer/ComposerAttachmentChips"
import { ReasoningEffortSelect } from "@/components/chat/composer/ReasoningEffortSelect"
import { CHAT_COMPOSER_PLACEHOLDERS } from "@/components/chat/composer/constants"
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/components/shared/motion/animated-toast-stack"
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
  normalizeAttachmentMimeType,
} from "@/lib/attachment-limits"
import { useChatUiStore } from "@/stores/AppStateProvider"
import { CHAT_MODEL_CONFIG, isChatModelId } from "@/lib/chat-models"
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
}: ChatComposerProps) {
  // Latest-ref: stable onSubmit for ComposerDraftField without stale closures.
  // Prefer this over useEffectEvent here — Effect Events must not be child props.
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit
  const submit = useCallback(() => {
    onSubmitRef.current()
  }, [])

  const { attachments, addFiles, removeAttachment } =
    useComposerAttachments(threadStateKey)
  const toasts = useAnimatedToastStack({ limit: 1 })
  const uploadToastActive = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return

    const pdfCount = Array.from(fileList).filter(
      (file) => normalizeAttachmentMimeType(file) === "application/pdf"
    ).length

    await addFiles(fileList, {
      onBatchStart: () => {
        if (pdfCount === 0) return
        uploadToastActive.current = true
        toasts.showToast({
          id: ATTACHMENT_UPLOAD_TOAST_ID,
          title: ATTACHMENT_UPLOAD_TOAST.uploading(pdfCount),
          status: "loading",
          duration: 0,
          dismissible: false,
        })
      },
      onRejected: (message) => {
        toasts.showToast({
          id: ATTACHMENT_UPLOAD_TOAST_ID,
          title: message,
          status: "error",
          duration: 3600,
        })
      },
    })
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

  useEffect(() => {
    if (!uploadToastActive.current || busyUploading || !allSettled) return
    uploadToastActive.current = false
    const failedCount = attachments.filter(
      (attachment) => attachment.status === "failed"
    ).length
    toasts.updateToast(ATTACHMENT_UPLOAD_TOAST_ID, {
      title:
        failedCount === 0
          ? ATTACHMENT_UPLOAD_TOAST.ready
          : attachments.length === 1
            ? ATTACHMENT_UPLOAD_TOAST.failed
            : ATTACHMENT_UPLOAD_TOAST.someFailed,
      status: failedCount > 0 ? "error" : "success",
      duration: 2800,
      dismissible: true,
    })
  }, [allSettled, attachments, busyUploading, toasts])

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
                  toasts.showToast({
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
              canSubmit={!isLoading && !disabled}
            />
          </div>

          <ComposerToolbar
            threadStateKey={threadStateKey}
            effectiveReasoningEffort={effectiveReasoningEffort}
            supportedReasoningEfforts={supportedReasoningEfforts}
            isLoading={isLoading}
            disabled={disabled}
            onStop={onStop}
            onAttachClick={() => fileInputRef.current?.click()}
            attachDisabled={disabled || isLoading}
            toast={
              <AnimatedToastStack
                toasts={toasts.toasts}
                onDismiss={toasts.dismissToast}
              />
            }
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
  canSubmit,
}: {
  threadStateKey: string
  disabled: boolean
  placeholder: string
  onSubmit: () => void
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
  isLoading,
  disabled,
  onStop,
  onAttachClick,
  attachDisabled,
  toast,
}: {
  threadStateKey: string
  effectiveReasoningEffort: ReasoningEffort
  supportedReasoningEfforts: ReadonlyArray<ReasoningEffort>
  isLoading: boolean
  disabled: boolean
  onStop?: () => void
  onAttachClick: () => void
  attachDisabled: boolean
  toast: ReactNode
}) {
  const composer = useThreadComposerToolbarControls(threadStateKey)
  const { isLoading: modelPreferencesLoading } = useModelPreferences()

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
          <ToolbarToggle
            pressed={composer.searchEnabled}
            onPressedChange={(searchEnabled) =>
              composer.setSearchEnabled(threadStateKey, searchEnabled)
            }
            label="Search"
            icon={<GlobeIcon className="size-3.5" />}
            disabled={modelPreferencesLoading || disabled}
            tooltip={
              composer.searchEnabled ? "Disable web search" : "Search the web"
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
        </div>
      </div>

      <div
        className={cn(
          "relative min-w-0 flex-1 self-stretch overflow-visible",
          ATTACHMENT_UPLOAD_TOAST_GAP_FROM_ATTACH
        )}
      >
        {toast}
        <div className="flex h-full items-center justify-end">
          <ComposerSendButton
            threadStateKey={threadStateKey}
            isLoading={isLoading}
            disabled={disabled}
            onStop={onStop}
          />
        </div>
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

function ToolbarToggle({
  pressed,
  onPressedChange,
  label,
  icon,
  tooltip,
  disabled = false,
}: {
  pressed: boolean
  onPressedChange: (next: boolean) => void
  label: string
  icon: ReactNode
  tooltip?: ReactNode
  disabled?: boolean
}) {
  const button = (
    <span className={cn("inline-flex", disabled && "cursor-not-allowed")}>
      <button
        type="button"
        aria-pressed={pressed}
        disabled={disabled}
        onClick={() => onPressedChange(!pressed)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm transition-colors disabled:pointer-events-none disabled:opacity-50",
          pressed
            ? "border-foreground/15 bg-accent text-foreground"
            : "border-border/70 bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        {icon}
        {label}
      </button>
    </span>
  )

  return tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button
}
