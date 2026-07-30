import { AnimatePresence, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import type { ModelCatalogEntry } from "@t3chat/model-catalog"

import { ModelPickerRow } from "@/components/chat/model-picker/ModelPickerRow"
import { EASE_OUT } from "@/lib/ease"
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
  const reduceMotion = useReducedMotion()
  const rowMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 6, scale: 0.985, filter: "blur(3px)" },
        animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, y: -5, scale: 0.985, filter: "blur(3px)" },
      }

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 scrollbar-thin flex-col gap-1 overflow-y-auto overscroll-contain p-2",
        className
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {models.length === 0 ? (
          <m.p
            key="empty"
            layout="position"
            {...rowMotion}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className="px-2 py-6 text-center text-sm text-muted-foreground"
          >
            {emptyMessage}
          </m.p>
        ) : (
          models.map((model) => (
            <m.div
              key={model.id}
              layout="position"
              {...rowMotion}
              transition={{
                layout: { duration: 0.2, ease: EASE_OUT },
                duration: 0.16,
                ease: EASE_OUT,
              }}
            >
              <ModelPickerRow
                model={model}
                isSelected={model.id === selectedModelId}
                isFavorite={favoriteIds.has(model.id)}
                onSelect={onSelect}
                onToggleFavorite={onToggleFavorite}
              />
            </m.div>
          ))
        )}
      </AnimatePresence>
    </div>
  )
}
