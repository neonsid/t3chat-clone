import { CheckIcon, ChevronDownIcon, FilterIcon } from "lucide-react"
import { MODEL_CAPABILITIES } from "@t3chat/model-catalog"
import type { ModelCapability } from "@t3chat/model-catalog"

import { MODELS_PAGE, type ModelsAccessFilter } from "@/components/settings/constants"
import { MODEL_CAPABILITY_VISUALS } from "@/components/chat/model-picker/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { Button } from "@/components/shared/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import { Separator } from "@/components/shared/ui/separator"
import { cn } from "@/lib/utils"

export function ModelsFilterMenu({
  activeCapabilities,
  access,
  onToggleCapability,
  onAccessChange,
}: {
  activeCapabilities: ReadonlyArray<ModelCapability>
  access: ModelsAccessFilter
  onToggleCapability: (capability: ModelCapability) => void
  onAccessChange: (access: ModelsAccessFilter) => void
}) {
  const activeCount =
    activeCapabilities.length + (access === "all" ? 0 : 1)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-md"
            aria-label={MODELS_PAGE.filterLabel}
          />
        }
      >
        <FilterIcon />
        {MODELS_PAGE.filterLabel}
        <ChevronDownIcon />
        {activeCount > 0 ? (
          <span className="size-1.5 rounded-md bg-primary" />
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-60 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md"
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
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
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

        <AccessFilterButton
          label={MODELS_PAGE.freeTierOnly}
          pressed={access === "free"}
          onClick={() => onAccessChange(access === "free" ? "all" : "free")}
        />
        <AccessFilterButton
          label={MODELS_PAGE.premiumOnly}
          pressed={access === "premium"}
          onClick={() =>
            onAccessChange(access === "premium" ? "all" : "premium")
          }
        />
      </PopoverContent>
    </Popover>
  )
}

function AccessFilterButton({
  label,
  pressed,
  onClick,
}: {
  label: string
  pressed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
    >
      <span className="flex-1 truncate">{label}</span>
      {pressed ? <CheckIcon className="size-4 shrink-0 text-primary" /> : null}
    </button>
  )
}
