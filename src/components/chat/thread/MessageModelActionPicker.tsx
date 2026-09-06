import { useMemo, useRef, useState, type ComponentType } from "react"
import { ChevronRightIcon, StarIcon } from "lucide-react"
import type { ModelCatalogEntry } from "@t3chat/model-catalog"

import { MODEL_PICKER_RAIL_PROVIDERS } from "@/components/chat/model-picker/constants"
import { ModelCapabilityBadges } from "@/components/chat/model-picker/ModelCapabilityBadges"
import { ModelPriceMeter } from "@/components/chat/model-picker/ModelPriceMeter"
import { ProviderLogo } from "@/components/chat/model-picker/ProviderLogo"
import { modelsForRailTab } from "@/components/chat/model-picker/logic"
import {
  MESSAGE_BRANCH,
  MESSAGE_CHROME,
} from "@/components/chat/thread/constants"
import { Button } from "@/components/shared/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import { useMountEffect } from "@/hooks/useMountEffect"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { isChatModelId } from "@/lib/chat-models"
import type { ModelRailTab } from "@/stores/model-picker-store"
import { cn } from "@/lib/utils"

export type MessageModelAction = {
  modelId?: string
}

type MessageModelActionPickerProps = {
  disabled?: boolean
  label: string
  primaryLabel: string
  modelAriaPrefix: string
  icon: ComponentType<{ className?: string }>
  iconClassName?: string
  onAction?: (action?: MessageModelAction) => void | Promise<void>
}

export function MessageModelActionPicker({
  disabled,
  label,
  primaryLabel,
  modelAriaPrefix,
  icon: Icon,
  iconClassName,
  onAction,
}: MessageModelActionPickerProps) {
  const preferences = useModelPreferences()
  const [open, setOpen] = useState(false)
  const [railTab, setRailTab] = useState<ModelRailTab | null>(null)
  const [pending, setPending] = useState(false)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const favoriteIds = useMemo(
    () => new Set(preferences.favoriteModelIds),
    [preferences.favoriteModelIds]
  )
  const models = useMemo(
    () => (railTab ? modelsForRailTab(railTab, favoriteIds) : []),
    [favoriteIds, railTab]
  )

  useMountEffect(() => () => {
    if (openTimer.current) clearTimeout(openTimer.current)
    if (closeTimer.current) clearTimeout(closeTimer.current)
  })

  if (!onAction) return null
  const action = onAction

  function clearTimers() {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function openMenu() {
    if (disabled) return
    clearTimers()
    setPending(false)
    setOpen(true)
  }

  function closeMenu() {
    clearTimers()
    setOpen(false)
    setRailTab(null)
  }

  function scheduleOpen() {
    if (disabled || open) return
    clearTimers()
    openTimer.current = setTimeout(openMenu, MESSAGE_BRANCH.openDelayMs)
  }

  function scheduleClose() {
    clearTimers()
    closeTimer.current = setTimeout(closeMenu, MESSAGE_BRANCH.closeDelayMs)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      openMenu()
      return
    }
    closeMenu()
  }

  function commitAction(next?: MessageModelAction) {
    if (pending || disabled) return
    setPending(true)
    closeMenu()
    void Promise.resolve(action(next))
  }

  function handleSelectModel(modelId: string) {
    if (!isChatModelId(modelId)) return
    preferences.selectModel(modelId)
    commitAction({ modelId })
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <span
        className="inline-flex"
        onPointerEnter={scheduleOpen}
        onPointerLeave={scheduleClose}
      >
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className={MESSAGE_CHROME.iconButtonClassName}
              aria-label={label}
              disabled={disabled}
            />
          }
        >
          <Icon className="size-4" />
        </PopoverTrigger>
      </span>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        onPointerEnter={clearTimers}
        onPointerLeave={scheduleClose}
        className={cn(
          "flex max-h-[min(28rem,var(--available-height,28rem))] overflow-hidden p-0",
          railTab ? "w-[min(36rem,calc(100vw-2rem))]" : "w-52"
        )}
      >
        <div className="flex w-52 shrink-0 flex-col border-r border-border/70">
          <div className="p-1.5">
            <button
              type="button"
              className={MESSAGE_BRANCH.providerButtonClassName}
              disabled={pending}
              onClick={() => commitAction()}
            >
              <Icon
                aria-hidden="true"
                className={cn("size-4 shrink-0 text-pink-400", iconClassName)}
              />
              <span className="min-w-0 flex-1 truncate">{primaryLabel}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground">
              {MESSAGE_BRANCH.orSwitchModel}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div
            role="tablist"
            aria-label="Filter by provider"
            aria-orientation="vertical"
            className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-label="Favorites"
              aria-selected={railTab === "favorites"}
              data-active={railTab === "favorites" || undefined}
              className={MESSAGE_BRANCH.providerButtonClassName}
              onPointerEnter={() => setRailTab("favorites")}
              onFocus={() => setRailTab("favorites")}
              onClick={() => setRailTab("favorites")}
            >
              <StarIcon
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0",
                  railTab === "favorites" && "fill-current"
                )}
              />
              <span className="min-w-0 flex-1 truncate">
                {MESSAGE_BRANCH.favorites}
              </span>
              <ChevronRightIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
            </button>

            {MODEL_PICKER_RAIL_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                role="tab"
                aria-label={provider.name}
                aria-selected={railTab === provider.id}
                data-active={railTab === provider.id || undefined}
                className={MESSAGE_BRANCH.providerButtonClassName}
                onPointerEnter={() => setRailTab(provider.id)}
                onFocus={() => setRailTab(provider.id)}
                onClick={() => setRailTab(provider.id)}
              >
                <ProviderLogo providerId={provider.id} className="size-4" />
                <span className="min-w-0 flex-1 truncate">{provider.name}</span>
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              </button>
            ))}
          </div>
        </div>

        {railTab ? (
          <ActionModelList
            models={models}
            emptyMessage={
              railTab === "favorites"
                ? MESSAGE_BRANCH.emptyFavorites
                : MESSAGE_BRANCH.emptyProvider
            }
            disabled={pending}
            modelAriaPrefix={modelAriaPrefix}
            onSelect={handleSelectModel}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function ActionModelList({
  models,
  emptyMessage,
  disabled,
  modelAriaPrefix,
  onSelect,
}: {
  models: ReadonlyArray<ModelCatalogEntry>
  emptyMessage: string
  disabled: boolean
  modelAriaPrefix: string
  onSelect: (modelId: string) => void
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-1.5">
      {models.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        models.map((model) => (
          <button
            key={model.id}
            type="button"
            disabled={disabled}
            aria-label={`${modelAriaPrefix} ${model.name}`}
            onClick={() => onSelect(model.id)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            <ProviderLogo providerId={model.providerId} className="size-5" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {model.name}
            </span>
            <ModelPriceMeter
              inputCostPerMillion={model.inputCostPerMillion}
              outputCostPerMillion={model.outputCostPerMillion}
            />
            <ModelCapabilityBadges
              capabilities={model.capabilities}
              className="mt-0 rounded-md border-0 bg-transparent p-0 shadow-none"
            />
          </button>
        ))
      )}
    </div>
  )
}
