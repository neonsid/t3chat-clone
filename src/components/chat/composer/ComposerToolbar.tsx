import { memo, useState } from "react"
import type { KeyboardEvent } from "react"
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
import { ComposerUsageButton } from "@/components/chat/composer/ComposerUsageButton"
import { ReasoningEffortSelect } from "@/components/chat/composer/ReasoningEffortSelect"
import { SEARCH_TOGGLE } from "@/components/chat/composer/constants"
import { webSearchTooltip } from "@/components/chat/composer/logic"
import type { ComposerUsageStripData } from "@/hooks/useComposerUsage"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import {
  useThreadComposerCanSend,
  useThreadComposerToolbarControls,
} from "@/hooks/useThreadComposerState"
import { CHAT_MODEL_CONFIG, isChatModelId } from "@/lib/chat-models"
import type { ReasoningEffort } from "@/lib/chat-models"
import {
  modelSupportsWebSearch,
  stepSearchLimit,
  WEB_SEARCH_LIMIT,
} from "@/lib/web-search"
import { cn } from "@/lib/utils"

export const ComposerToolbar = memo(function ComposerToolbar({
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
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm",
                  "border-border/70 bg-transparent text-muted-foreground",
                  "transition-colors hover:bg-accent hover:text-foreground",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
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

export const ComposerSendButton = memo(function ComposerSendButton({
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
  const isActionDisabled = isLoading ? false : !canSend
  let actionTooltip = "Add a message or ready attachment"
  if (isLoading) actionTooltip = "Stop generating"
  else if (canSend) actionTooltip = "Send message"

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
            "relative isolate flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border",
            "transition-[color,background-color,opacity,transform,box-shadow] duration-150",
            "active:scale-95 enabled:cursor-pointer",
            "disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100",
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

const searchEditorButtonClassName =
  "flex size-6 cursor-pointer items-center justify-center disabled:pointer-events-none disabled:opacity-40"
const searchActiveClassName =
  "border-primary bg-primary text-primary-foreground"
const searchIdleClassName =
  "border-border/70 bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"

export function SearchToggle({
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
  const isEditingLimit = showLimit && editingLimit

  const changeLimit = (delta: number) => {
    onSearchLimitChange(stepSearchLimit(searchLimit, delta))
  }

  if (isEditingLimit) {
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
            searchActiveClassName,
            disabled && "opacity-50"
          )}
        >
          <button
            type="button"
            aria-label={SEARCH_TOGGLE.decreaseLimit}
            disabled={disabled || searchLimit <= WEB_SEARCH_LIMIT.min}
            onClick={() => changeLimit(-1)}
            className={searchEditorButtonClassName}
          >
            <MinusIcon className="size-3.5" />
          </button>
          <span className="min-w-5 text-center tabular-nums">
            {searchLimit}
          </span>
          <button
            type="button"
            aria-label={SEARCH_TOGGLE.increaseLimit}
            disabled={disabled || searchLimit >= WEB_SEARCH_LIMIT.max}
            onClick={() => changeLimit(1)}
            className={searchEditorButtonClassName}
          >
            <PlusIcon className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={SEARCH_TOGGLE.confirmLimit}
            disabled={disabled}
            onClick={() => setEditingLimit(false)}
            className={searchEditorButtonClassName}
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
            pressed ? searchActiveClassName : searchIdleClassName,
            disabled && "opacity-50"
          )}
        >
          <button
            type="button"
            aria-pressed={pressed}
            disabled={disabled}
            onClick={() => {
              setEditingLimit(false)
              onPressedChange(!pressed)
            }}
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
