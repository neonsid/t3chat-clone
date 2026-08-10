import { useMemo, useRef, useState } from "react"
import { ChevronDownIcon, SearchIcon } from "lucide-react"
import { useShallow } from "zustand/react/shallow"

import { MODEL_PICKER_RAIL_PROVIDERS } from "@/components/chat/model-picker/constants"
import { ModelPickerFilterMenu } from "@/components/chat/model-picker/ModelPickerFilterMenu"
import { ModelPickerList } from "@/components/chat/model-picker/ModelPickerList"
import { ModelPickerRail } from "@/components/chat/model-picker/ModelPickerRail"
import { ModelPriceMeter } from "@/components/chat/model-picker/ModelPriceMeter"
import { filterModels } from "@/components/chat/model-picker/logic"
import type { ModelQuery } from "@/components/chat/model-picker/logic"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import { Separator } from "@/components/shared/ui/separator"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { getChatModelById } from "@/lib/chat-models"
import { useModelPickerStore } from "@/stores/AppStateProvider"
import { cn } from "@/lib/utils"

type ModelPickerProps = {
  onSelectModel?: (modelId: string) => void
  className?: string
}

export function ModelPicker({ onSelectModel, className }: ModelPickerProps) {
  const preferences = useModelPreferences()
  const picker = useModelPickerStore(
    useShallow((state) => ({
      search: state.search,
      capabilities: state.capabilities,
      railTab: state.railTab,
      setSearch: state.setSearch,
      setRailTab: state.setRailTab,
      toggleCapability: state.toggleCapability,
      clearFilters: state.clearFilters,
    }))
  )
  const [open, setOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const favoriteIds = useMemo(
    () => new Set(preferences.favoriteModelIds),
    [preferences.favoriteModelIds]
  )

  const query = useMemo<ModelQuery>(
    () => ({
      search: picker.search,
      capabilities: picker.capabilities,
      providerId: picker.railTab === "favorites" ? null : picker.railTab,
      favoritesOnly: picker.railTab === "favorites",
      combineResults: preferences.combineResults,
    }),
    [
      picker.capabilities,
      picker.railTab,
      picker.search,
      preferences.combineResults,
    ]
  )

  const visibleModels = useMemo(
    () => filterModels(query, favoriteIds),
    [favoriteIds, query]
  )

  const selectedModel = preferences.isLoading
    ? null
    : getChatModelById(preferences.selectedModelId)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    // A stale query would otherwise greet the user on the next open.
    if (!nextOpen) picker.setSearch("")
  }

  function handleSelect(modelId: string) {
    preferences.selectModel(modelId)
    onSelectModel?.(modelId)
    handleOpenChange(false)
  }

  function handleSelectRailTab(tab: Parameters<typeof picker.setRailTab>[0]) {
    picker.setRailTab(tab)
    if (preferences.combineResults) preferences.setCombineResults(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-busy={preferences.isLoading}
            aria-label={
              preferences.isLoading
                ? "Loading model"
                : `Model: ${selectedModel?.name ?? "none selected"}`
            }
            disabled={preferences.isLoading}
            className={cn(
              "inline-flex max-w-48 min-w-0 shrink cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70 aria-expanded:bg-accent aria-expanded:text-foreground sm:max-w-56 sm:px-3",
              className
            )}
          />
        }
      >
        {preferences.isLoading ? (
          <span className="truncate">Loading...</span>
        ) : (
          <>
            <span className="truncate">
              {selectedModel?.name ?? "Select model"}
            </span>
            {selectedModel ? (
              <ModelPriceMeter
                inputCostPerMillion={selectedModel.inputCostPerMillion}
                outputCostPerMillion={selectedModel.outputCostPerMillion}
              />
            ) : null}
            <ChevronDownIcon
              aria-hidden="true"
              className={cn(
                "size-3 shrink-0 opacity-100 transition-transform duration-200 ease-out motion-reduce:transition-none",
                open && "rotate-180"
              )}
            />
          </>
        )}
      </PopoverTrigger>

      <PopoverContent
        initialFocus={searchInputRef}
        side="top"
        align="start"
        sideOffset={12}
        className="flex max-h-[min(26rem,var(--available-height,26rem))] w-[min(32rem,calc(100vw-2rem))] flex-col overflow-hidden"
      >
        <div className="relative flex shrink-0 items-center gap-2 px-3 py-2.5">
          <SearchIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            value={picker.search}
            onChange={(event) => picker.setSearch(event.target.value)}
            placeholder="Search models..."
            aria-label="Search models"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <ModelPickerFilterMenu
            activeCapabilities={picker.capabilities}
            combineResults={preferences.combineResults}
            hasActiveFilters={
              picker.search.trim().length > 0 || picker.capabilities.length > 0
            }
            onToggleCapability={picker.toggleCapability}
            onCombineResultsChange={preferences.setCombineResults}
            onClearFilters={picker.clearFilters}
          />
          <Separator className="absolute right-[3.25rem] bottom-1.5 left-3 w-auto! bg-border/60" />
        </div>

        <div className="mt-1 flex min-h-0 flex-1">
          <ModelPickerRail
            providers={MODEL_PICKER_RAIL_PROVIDERS}
            activeTab={picker.railTab}
            onSelectTab={handleSelectRailTab}
            hidden={preferences.combineResults}
          />
          <ModelPickerList
            models={visibleModels}
            selectedModelId={preferences.selectedModelId}
            favoriteIds={favoriteIds}
            emptyMessage={resolveEmptyMessage(query)}
            onSelect={handleSelect}
            onToggleFavorite={preferences.toggleFavorite}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function resolveEmptyMessage(query: ModelQuery): string {
  if (query.search.trim() || query.capabilities.length > 0) {
    return "No models match these filters"
  }
  if (query.favoritesOnly) {
    return "Star a model to keep it here"
  }
  return "No models available"
}
