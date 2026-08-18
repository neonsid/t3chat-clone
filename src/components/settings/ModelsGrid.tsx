import { StarIcon } from "lucide-react"
import type { ModelCapability, ModelCatalogEntry } from "@t3chat/model-catalog"

import { MODELS_PAGE } from "@/components/settings/constants"
import { modelVersionSubtitle } from "@/components/settings/logic"
import {
  MAX_VISIBLE_MODEL_CAPABILITIES,
  MODEL_CAPABILITY_LABELS,
  MODEL_CAPABILITY_VISUALS,
} from "@/components/chat/model-picker/constants"
import { ProviderLogo } from "@/components/chat/model-picker/ProviderLogo"
import { ModelPriceMeter } from "@/components/chat/model-picker/ModelPriceMeter"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { cn } from "@/lib/utils"

export function ModelsGrid({
  models,
  selectedIds,
  favoriteIds,
  newestIds,
  onToggleSelected,
  onToggleFavorite,
}: {
  models: ReadonlyArray<ModelCatalogEntry>
  selectedIds: ReadonlySet<string>
  favoriteIds: ReadonlySet<string>
  newestIds: ReadonlySet<string>
  onToggleSelected: (id: string) => void
  onToggleFavorite: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {models.map((model) => {
        const selected = selectedIds.has(model.id)
        const favorite = favoriteIds.has(model.id)
        const isNew = newestIds.has(model.id)
        const subtitle = modelVersionSubtitle(model)

        return (
          <div
            key={model.id}
            className={cn(
              "group relative flex h-56 cursor-pointer flex-col items-center rounded-md border border-border bg-card px-2.5 pt-8 pb-2.5 text-center transition-[border-color,background-color,box-shadow] hover:bg-accent/35",
              selected &&
                "border-amber-400/80 bg-amber-400/5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-amber-400)_40%,transparent)]"
            )}
            onClick={() => onToggleSelected(model.id)}
          >
            <button
              type="button"
              aria-pressed={favorite}
              aria-label={
                favorite
                  ? `${MODELS_PAGE.unfavorite} ${model.name}`
                  : `${MODELS_PAGE.favorite} ${model.name}`
              }
              onClick={(event) => {
                event.stopPropagation()
                onToggleFavorite(model.id)
              }}
              className={cn(
                "absolute top-1.5 left-1.5 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground/70 opacity-0 transition-opacity hover:bg-accent hover:text-amber-400 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none group-hover:opacity-100",
                favorite && "text-amber-400 opacity-100"
              )}
            >
              <StarIcon
                className={cn(
                  "size-3.5",
                  favorite && "fill-amber-400 text-amber-400"
                )}
              />
            </button>
            {isNew ? (
              <span className="absolute top-2 right-2 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                {MODELS_PAGE.newBadge}
              </span>
            ) : null}

            <span className="flex size-11 items-center justify-center rounded-md bg-foreground/5 text-foreground">
              <ProviderLogo
                providerId={model.providerId}
                className="size-7"
              />
            </span>
            <p className="mt-3 w-full truncate px-1 text-sm font-medium leading-5 text-foreground">
              {model.name}
            </p>
            <p className="mt-0.5 h-4 w-full truncate px-1 text-[11px] leading-4 text-muted-foreground">
              {subtitle ?? "\u00a0"}
            </p>
            <div className="mt-auto flex h-14 w-full flex-col items-center justify-end gap-2">
              <ModelPriceMeter
                inputCostPerMillion={model.inputCostPerMillion}
                outputCostPerMillion={model.outputCostPerMillion}
                className="h-4 min-w-[2.75rem] justify-center"
              />
              <ModelCardCapabilities capabilities={model.capabilities} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ModelCardCapabilities({
  capabilities,
}: {
  capabilities: ReadonlyArray<ModelCapability>
}) {
  const visible = capabilities.slice(0, MAX_VISIBLE_MODEL_CAPABILITIES)
  if (visible.length === 0) return <span className="h-7" />

  return (
    <span className="inline-flex h-7 min-w-16 items-center justify-center gap-1.5 rounded-md bg-foreground/5 px-2">
      {visible.map((capability) => {
        const visual = MODEL_CAPABILITY_VISUALS[capability]
        const label = MODEL_CAPABILITY_LABELS.get(capability) ?? capability
        const Icon = visual.icon

        return (
          <Tooltip key={capability} content={label}>
            <span
              aria-label={label}
              className={cn(
                visual.className,
                "inline-flex size-3.5 items-center justify-center bg-transparent"
              )}
            >
              <Icon className="size-3.5" />
            </span>
          </Tooltip>
        )
      })}
    </span>
  )
}
