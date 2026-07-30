import { InfoIcon, StarIcon } from "lucide-react"
import type { ModelCatalogEntry } from "@t3chat/model-catalog"

import { ModelCapabilityBadges } from "@/components/chat/model-picker/ModelCapabilityBadges"
import { ModelPriceMeter } from "@/components/chat/model-picker/ModelPriceMeter"
import { ProviderLogo } from "@/components/chat/model-picker/ProviderLogo"
import {
  formatCost,
  formatTokenLimit,
} from "@/components/chat/model-picker/modelPickerUtils"
import { Tooltip } from "@/components/motion/tooltip"
import { cn } from "@/lib/utils"

type ModelPickerRowProps = {
  model: ModelCatalogEntry
  isSelected: boolean
  isFavorite: boolean
  onSelect: (modelId: string) => void
  onToggleFavorite: (modelId: string) => void
}

function describeModel(model: ModelCatalogEntry): string {
  const contextTokens = formatTokenLimit(model.contextTokens)
  const outputTokens = formatTokenLimit(model.outputTokens)
  const facts = [
    contextTokens && `${contextTokens} context`,
    outputTokens && `${outputTokens} max output`,
    model.inputCostPerMillion !== null &&
      `$${formatCost(model.inputCostPerMillion)} in`,
    model.outputCostPerMillion !== null &&
      `$${formatCost(model.outputCostPerMillion)} out`,
    model.knowledgeCutoff && `knowledge ${model.knowledgeCutoff}`,
    model.releaseDate && `released ${model.releaseDate}`,
    model.openWeights && "open weights",
  ].filter((fact): fact is string => Boolean(fact))

  return facts.join(" · ")
}

export function ModelPickerRow({
  model,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: ModelPickerRowProps) {
  return (
    <div className="group/model relative">
      <button
        type="button"
        onClick={() => onSelect(model.id)}
        data-selected={isSelected || undefined}
        className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 pr-8 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none data-selected:bg-[color-mix(in_srgb,var(--foreground)_9%,transparent)]"
      >
        <ProviderLogo
          providerId={model.providerId}
          className="mt-0.5 size-4.5 text-foreground/85"
        />

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">
              {model.name}
            </span>
            <ModelPriceMeter
              inputCostPerMillion={model.inputCostPerMillion}
              className="shrink-0"
            />
            {model.experimental ? (
              <Tooltip content="Experimental">
                <span
                  aria-label="Experimental"
                  className="size-1.5 shrink-0 rounded-full bg-amber-400"
                />
              </Tooltip>
            ) : null}
          </span>
          {model.description ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-xs leading-4 text-muted-foreground">
                {model.description}
              </span>
              <Tooltip content={describeModel(model)}>
                <span className="shrink-0 text-muted-foreground/70">
                  <InfoIcon className="size-3" />
                </span>
              </Tooltip>
            </span>
          ) : null}
        </span>

        <ModelCapabilityBadges capabilities={model.capabilities} />
      </button>

      <button
        type="button"
        aria-pressed={isFavorite}
        aria-label={
          isFavorite
            ? `Remove ${model.name} from favorites`
            : `Add ${model.name} to favorites`
        }
        onClick={() => onToggleFavorite(model.id)}
        className={cn(
          "absolute top-2 right-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-opacity hover:text-amber-400 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
          isFavorite
            ? "opacity-100"
            : "opacity-0 group-hover/model:opacity-100 focus-visible:opacity-100"
        )}
      >
        <StarIcon
          className={cn(
            "size-3.5",
            isFavorite && "fill-amber-400 text-amber-400"
          )}
        />
      </button>
    </div>
  )
}
