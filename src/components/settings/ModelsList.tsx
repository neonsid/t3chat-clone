import { useState } from "react"
import { EllipsisIcon, SparklesIcon, StarIcon } from "lucide-react"
import type { ModelCatalogEntry } from "@t3chat/model-catalog"

import { MODELS_PAGE } from "@/components/settings/constants"
import { ProviderLogo } from "@/components/chat/model-picker/ProviderLogo"
import { ModelPriceMeter } from "@/components/chat/model-picker/ModelPriceMeter"
import { Button } from "@/components/shared/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import { cn } from "@/lib/utils"

export function ModelsList({
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
    <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
      {models.map((model) => {
        const selected = selectedIds.has(model.id)
        const favorite = favoriteIds.has(model.id)
        const isNew = newestIds.has(model.id)

        return (
          <li key={model.id}>
            <div
              className={cn(
                "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50",
                selected && "bg-primary/10"
              )}
              onClick={() => onToggleSelected(model.id)}
            >
              <span className="relative shrink-0 text-foreground">
                <span className="flex size-9 items-center justify-center rounded-md bg-foreground/5">
                  <ProviderLogo
                    providerId={model.providerId}
                    className="size-5"
                  />
                </span>
                {isNew ? (
                  <SparklesIcon
                    className="absolute -top-1 -left-1 size-3 fill-primary text-primary"
                    aria-label={MODELS_PAGE.newSparkle}
                  />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {model.name}
                  </p>
                  <ModelPriceMeter
                    inputCostPerMillion={model.inputCostPerMillion}
                    outputCostPerMillion={model.outputCostPerMillion}
                  />
                  <div
                    className="ml-auto shrink-0"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ModelRowMenu
                      name={model.name}
                      favorite={favorite}
                      onToggleFavorite={() => onToggleFavorite(model.id)}
                    />
                  </div>
                </div>
                {model.description ? (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {model.description}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function ModelRowMenu({
  name,
  favorite,
  onToggleFavorite,
}: {
  name: string
  favorite: boolean
  onToggleFavorite: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${MODELS_PAGE.moreActions} for ${name}`}
            className="rounded-md text-muted-foreground hover:text-foreground"
          />
        }
      >
        <EllipsisIcon />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-48 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md"
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite()
            setOpen(false)
          }}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        >
          <StarIcon
            className={cn(
              "size-3.5",
              favorite && "fill-amber-400 text-amber-400"
            )}
          />
          {favorite ? MODELS_PAGE.unfavorite : MODELS_PAGE.favorite}
        </button>
      </PopoverContent>
    </Popover>
  )
}

export function ModelsListEmpty() {
  return (
    <div className="rounded-md border border-border px-4 py-16 text-center text-sm text-muted-foreground">
      {MODELS_PAGE.empty}
    </div>
  )
}
