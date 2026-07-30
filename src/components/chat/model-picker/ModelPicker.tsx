import { useMemo, useState } from "react"
import { ChevronDownIcon, SearchIcon } from "lucide-react"
import { MODEL_CATALOG, MODEL_PROVIDERS } from "@t3chat/model-catalog"

import { ModelPickerFilterMenu } from "@/components/chat/model-picker/ModelPickerFilterMenu"
import { ModelPickerList } from "@/components/chat/model-picker/ModelPickerList"
import { ModelPickerRail } from "@/components/chat/model-picker/ModelPickerRail"
import { ModelPriceMeter } from "@/components/chat/model-picker/ModelPriceMeter"
import { ProviderLogo } from "@/components/chat/model-picker/ProviderLogo"
import {
  filterModels,
  ignoresRailScope,
} from "@/components/chat/model-picker/modelPickerUtils"
import type { ModelQuery } from "@/components/chat/model-picker/modelPickerUtils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { useModelStore } from "@/hooks/useModelStore"
import { getModelById, modelStore } from "@/lib/model-store"
import { cn } from "@/lib/utils"

const PROVIDER_IDS_WITH_MODELS = new Set(
  MODEL_CATALOG.map((model) => model.providerId)
)

/** Providers without catalog entries are left off the rail. */
const RAIL_PROVIDERS = MODEL_PROVIDERS.filter((provider) =>
  PROVIDER_IDS_WITH_MODELS.has(provider.id)
)

type ModelPickerProps = {
  className?: string
}

export function ModelPicker({ className }: ModelPickerProps) {
  const state = useModelStore()
  const [open, setOpen] = useState(false)

  const favoriteIds = useMemo(
    () => new Set(state.favoriteModelIds),
    [state.favoriteModelIds]
  )

  const query = useMemo<ModelQuery>(
    () => ({
      search: state.search,
      capabilities: state.capabilities,
      providerId: state.railTab === "favorites" ? null : state.railTab,
      favoritesOnly: state.railTab === "favorites",
      combineResults: state.combineResults,
    }),
    [state.capabilities, state.combineResults, state.railTab, state.search]
  )

  const visibleModels = useMemo(
    () => filterModels(query, favoriteIds),
    [favoriteIds, query]
  )

  const selectedModel = getModelById(state.selectedModelId)
  const railHidden = ignoresRailScope(query)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    // A stale query would otherwise greet the user on the next open.
    if (!nextOpen) modelStore.setSearch("")
  }

  function handleSelect(modelId: string) {
    modelStore.selectModel(modelId)
    handleOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Model: ${selectedModel?.name ?? "none selected"}`}
            className={cn(
              "inline-flex max-w-48 min-w-0 shrink cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground/80 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none aria-expanded:bg-accent aria-expanded:text-foreground sm:max-w-56 sm:px-3",
              className
            )}
          />
        }
      >
        {selectedModel ? (
          <ProviderLogo
            providerId={selectedModel.providerId}
            className="size-4"
          />
        ) : null}
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
            "size-3 shrink-0 opacity-60 transition-transform duration-200 ease-out motion-reduce:transition-none",
            open && "rotate-180"
          )}
        />
      </PopoverTrigger>

      <PopoverContent
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
            autoFocus
            value={state.search}
            onChange={(event) => modelStore.setSearch(event.target.value)}
            placeholder="Search models..."
            aria-label="Search models"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <ModelPickerFilterMenu
            activeCapabilities={state.capabilities}
            combineResults={state.combineResults}
            hasActiveFilters={
              state.search.trim().length > 0 || state.capabilities.length > 0
            }
            onToggleCapability={modelStore.toggleCapability}
            onCombineResultsChange={modelStore.setCombineResults}
            onClearFilters={modelStore.clearFilters}
          />
          <Separator className="absolute right-[3.25rem] bottom-1.5 left-3 w-auto! bg-border/60" />
        </div>

        <div className="mt-1 flex min-h-0 flex-1">
          <ModelPickerRail
            providers={RAIL_PROVIDERS}
            activeTab={state.railTab}
            onSelectTab={modelStore.setRailTab}
            hidden={railHidden}
          />
          <ModelPickerList
            models={visibleModels}
            selectedModelId={state.selectedModelId}
            favoriteIds={favoriteIds}
            emptyMessage={resolveEmptyMessage(query)}
            onSelect={handleSelect}
            onToggleFavorite={modelStore.toggleFavorite}
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
