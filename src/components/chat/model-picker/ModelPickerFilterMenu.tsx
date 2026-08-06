import { CheckIcon, FilterIcon } from "lucide-react"
import { MODEL_CAPABILITIES } from "@t3chat/model-catalog"
import type { ModelCapability } from "@t3chat/model-catalog"

import { MODEL_CAPABILITY_VISUALS } from "@/components/chat/model-picker/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import { Separator } from "@/components/shared/ui/separator"
import { cn } from "@/lib/utils"

type ModelPickerFilterMenuProps = {
  activeCapabilities: ReadonlyArray<ModelCapability>
  combineResults: boolean
  hasActiveFilters: boolean
  onToggleCapability: (capability: ModelCapability) => void
  onCombineResultsChange: (combineResults: boolean) => void
  onClearFilters: () => void
}

export function ModelPickerFilterMenu({
  activeCapabilities,
  combineResults,
  hasActiveFilters,
  onToggleCapability,
  onCombineResultsChange,
  onClearFilters,
}: ModelPickerFilterMenuProps) {
  const activeCount = activeCapabilities.length

  return (
    <Popover>
      <Tooltip
        content={
          activeCount > 0
            ? `Filter by capability (${activeCount} active)`
            : "Filter by capability"
        }
        wrapperClassName="shrink-0"
      >
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={
                activeCount > 0
                  ? `Filter by capability (${activeCount} active)`
                  : "Filter by capability"
              }
              className="relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none aria-expanded:bg-accent aria-expanded:text-foreground"
            />
          }
        >
          <FilterIcon className="size-4" />
          {activeCount > 0 ? (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
          ) : null}
        </PopoverTrigger>
      </Tooltip>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-60 overflow-hidden p-2"
      >
        {MODEL_CAPABILITIES.map((capability) => {
          const isActive = activeCapabilities.includes(capability.id)
          const visual = MODEL_CAPABILITY_VISUALS[capability.id]
          const Icon = visual.icon

          return (
            <Tooltip
              key={capability.id}
              content={capability.description}
              side="left"
              wrapperClassName="w-full"
            >
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onToggleCapability(capability.id)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
                    visual.className
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 truncate">{capability.label}</span>
                {isActive ? (
                  <CheckIcon className="size-4 shrink-0 text-primary" />
                ) : null}
              </button>
            </Tooltip>
          )
        })}

        <Separator className="my-1" />

        <Tooltip
          content="Search every provider at once instead of the selected one"
          side="left"
          wrapperClassName="w-full"
        >
          <button
            type="button"
            aria-pressed={combineResults}
            onClick={() => onCombineResultsChange(!combineResults)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            <span className="flex-1 truncate">Show combined results</span>
            {combineResults ? (
              <CheckIcon className="size-4 shrink-0 text-primary" />
            ) : null}
          </button>
        </Tooltip>

        {hasActiveFilters && (
          <>
            <Separator className="my-1" />
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={onClearFilters}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="flex-1 truncate">Clear filters</span>
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
