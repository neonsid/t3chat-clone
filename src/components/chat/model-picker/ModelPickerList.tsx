import type { ModelCatalogEntry } from "@t3chat/model-catalog"

import { ModelPickerRow } from "@/components/chat/model-picker/ModelPickerRow"
import { cn } from "@/lib/utils"

type ModelPickerListProps = {
  models: ReadonlyArray<ModelCatalogEntry>
  selectedModelId: string
  favoriteIds: ReadonlySet<string>
  emptyMessage: string
  onSelect: (modelId: string) => void
  onToggleFavorite: (modelId: string) => void
  className?: string
}

export function ModelPickerList({
  models,
  selectedModelId,
  favoriteIds,
  emptyMessage,
  onSelect,
  onToggleFavorite,
  className,
}: ModelPickerListProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 scrollbar-thin flex-col gap-1 overflow-y-auto overscroll-contain p-2",
        className
      )}
    >
      {models.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        models.map((model) => (
          <ModelPickerRow
            key={model.id}
            model={model}
            isSelected={model.id === selectedModelId}
            isFavorite={favoriteIds.has(model.id)}
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
          />
        ))
      )}
    </div>
  )
}
