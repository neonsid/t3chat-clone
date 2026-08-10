import { useRef } from "react"
import type { FormEvent, KeyboardEvent, ReactNode } from "react"
import { ArrowUpIcon, GlobeIcon, PaperclipIcon, SquareIcon } from "lucide-react"

import { ModelPicker } from "@/components/chat/model-picker/ModelPicker"
import { ReasoningEffortSelect } from "@/components/chat/composer/ReasoningEffortSelect"
import { CHAT_COMPOSER_PLACEHOLDERS } from "@/components/chat/composer/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { useThreadComposerControls } from "@/hooks/useThreadComposerState"
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

export function ChatComposer({
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const composer = useThreadComposerControls(threadStateKey)
  const canSend = composer.draft.trim().length > 0 && !isLoading && !disabled
  const canStop = isLoading && !disabled && Boolean(onStop)
  const isActionDisabled = isLoading ? !canStop : !canSend
  const actionTooltip = isLoading
    ? "Stop generating"
    : canSend
      ? "Send message"
      : "Message requires text"

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend) return
    onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (canSend) onSubmit()
    }
  }

  return (
    <div
      className={cn(
        "chat-composer-glass-shell relative mx-auto w-full max-w-3xl",
        className
      )}
    >
      <div className="chat-composer-glass-host relative z-10 w-full rounded-[18px]">
        <form
          className="mx-auto w-full max-w-3xl min-w-0"
          data-chat-composer-form="true"
          onSubmit={handleSubmit}
        >
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <textarea
              ref={textareaRef}
              data-chat-composer-input="true"
              aria-label="Message"
              className="field-sizing-content max-h-50 min-h-12 w-full resize-none bg-transparent text-[15px] leading-6 text-foreground outline-none placeholder:text-[var(--placeholder,var(--muted-foreground))] disabled:opacity-60"
              disabled={disabled || isLoading}
              onChange={(event) =>
                composer.setDraft(threadStateKey, event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              value={composer.draft}
            />
          </div>

          <div className="flex min-w-0 items-center gap-2 px-3 pb-7 sm:px-4 sm:pb-8">
            <ModelPicker
              onSelectModel={(modelId) => {
                if (!isChatModelId(modelId)) return
                composer.setReasoningEffort(
                  threadStateKey,
                  CHAT_MODEL_CONFIG[modelId].defaultReasoningEffort
                )
              }}
            />

            {supportedReasoningEfforts.length > 1 ? (
              <ReasoningEffortSelect
                value={effectiveReasoningEffort}
                supportedEfforts={supportedReasoningEfforts}
                onValueChange={(reasoningEffort) =>
                  composer.setReasoningEffort(threadStateKey, reasoningEffort)
                }
                disabled={disabled || isLoading}
              />
            ) : null}

            <div className="flex min-w-0 flex-1 [scrollbar-width:none] items-center justify-start gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <ToolbarToggle
                pressed={composer.searchEnabled}
                onPressedChange={(searchEnabled) =>
                  composer.setSearchEnabled(threadStateKey, searchEnabled)
                }
                label="Search"
                icon={<GlobeIcon className="size-3.5" />}
                tooltip={
                  composer.searchEnabled
                    ? "Disable web search"
                    : "Search the web"
                }
              />
              <Tooltip content="Attach files">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-transparent px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Attach"
                >
                  <PaperclipIcon className="size-3.5" />
                  Attach
                </button>
              </Tooltip>
            </div>

            <Tooltip content={actionTooltip}>
              <span
                className={cn(
                  "inline-flex",
                  isActionDisabled && "cursor-not-allowed"
                )}
              >
                <button
                  type={isLoading ? "button" : "submit"}
                  aria-label={isLoading ? "Stop generating" : "Send message"}
                  disabled={isActionDisabled}
                  onClick={isLoading ? onStop : undefined}
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
          </div>
        </form>
      </div>
    </div>
  )
}

function ToolbarToggle({
  pressed,
  onPressedChange,
  label,
  icon,
  tooltip,
}: {
  pressed: boolean
  onPressedChange: (next: boolean) => void
  label: string
  icon: ReactNode
  tooltip?: ReactNode
}) {
  const button = (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm transition-colors",
        pressed
          ? "border-foreground/15 bg-accent text-foreground"
          : "border-border/70 bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  )

  return tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button
}
