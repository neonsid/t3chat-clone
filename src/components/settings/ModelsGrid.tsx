import { StarIcon } from "lucide-react"
import { MODEL_CAPABILITIES } from "@t3chat/model-catalog"
import type { ModelCapability, ModelCatalogEntry } from "@t3chat/model-catalog"

import { MODELS_PAGE } from "@/components/settings/constants"
import { modelVersionSubtitle } from "@/components/settings/logic"
import {
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {models.map((model) => {
        const selected = selectedIds.has(model.id)
        const favorite = favoriteIds.has(model.id)
        const isNew = newestIds.has(model.id)
        const subtitle = modelVersionSubtitle(model)

        return (
          <div
            key={model.id}
            className={cn(
              "relative flex min-h-52 cursor-pointer flex-col items-center rounded-md border border-border bg-card px-3 pt-8 pb-3 text-center transition-colors hover:bg-accent/40",
              selected &&
                "border-amber-400 shadow-[0_0_16px_color-mix(in_srgb,var(--color-amber-400)_35%,transparent)]"
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
                "absolute top-2 left-2 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-amber-400 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                favorite && "text-amber-400"
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
              <span className="absolute top-2 right-2 rounded-md bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-pink-400">
                {MODELS_PAGE.newBadge}
              </span>
            ) : null}

            <ProviderLogo
              providerId={model.providerId}
              className="size-10 text-foreground"
            />
            <p className="mt-3 w-full truncate text-sm font-semibold text-foreground">
              {model.name}
            </p>
            {subtitle ? (
              <p className="mt-0.5 w-full truncate text-xs text-pink-400/90">
                {subtitle}
              </p>
            ) : null}
            <div className="mt-auto flex w-full flex-col items-center gap-2 pt-3">
              <ModelPriceMeter
                inputCostPerMillion={model.inputCostPerMillion}
                outputCostPerMillion={model.outputCostPerMillion}
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
  if (capabilities.length === 0) return null

  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1">
      {capabilities.map((capability) => {
        const visual = MODEL_CAPABILITY_VISUALS[capability]
        const meta = MODEL_CAPABILITIES.find((item) => item.id === capability)
        const label = meta?.label ?? capability
        const Icon = visual.icon

        return (
          <Tooltip key={capability} content={meta?.description ?? label}>
            <span
              aria-label={label}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-md",
                visual.className
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
