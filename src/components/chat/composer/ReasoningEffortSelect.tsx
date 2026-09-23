import { Select } from "@base-ui/react/select"
import { ZapIcon } from "lucide-react"

import { REASONING_EFFORTS } from "@/components/chat/composer/constants"
import type {
  ReasoningEffort,
  ReasoningEffortOption,
} from "@/components/chat/composer/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { cn } from "@/lib/utils"

function BrainAssetIcon({
  src,
  className,
}: {
  src: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block bg-current", className)}
      style={{
        maskImage: `url("${src}")`,
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskImage: `url("${src}")`,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
      }}
    />
  )
}

function ReasoningEffortIcon({
  option,
  className,
}: {
  option: ReasoningEffortOption
  className?: string
}) {
  if (option.iconSrc == null) {
    return <ZapIcon className={className} />
  }
  return <BrainAssetIcon src={option.iconSrc} className={className} />
}

export type { ReasoningEffort } from "@/components/chat/composer/constants"

type ReasoningEffortSelectProps = {
  value: ReasoningEffort
  supportedEfforts: ReadonlyArray<ReasoningEffort>
  onValueChange: (value: ReasoningEffort) => void
  disabled?: boolean
  className?: string
}

export function ReasoningEffortSelect({
  value,
  supportedEfforts,
  onValueChange,
  disabled = false,
  className,
}: ReasoningEffortSelectProps) {
  const availableOptions = REASONING_EFFORTS.filter((option) =>
    supportedEfforts.includes(option.value)
  )
  const selectedOption =
    availableOptions.find((option) => option.value === value) ??
    availableOptions[0]

  return (
    <Select.Root
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next)
      }}
      disabled={disabled}
    >
      <div className={cn("relative shrink-0", className)}>
        <Tooltip content="Set reasoning effort">
          <Select.Trigger
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm",
              "border-foreground/15 bg-accent text-foreground",
              "transition-colors hover:bg-accent/80",
              "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            <ReasoningEffortIcon option={selectedOption} className="size-4" />
            <span>{selectedOption.label}</span>
          </Select.Trigger>
        </Tooltip>
      </div>

      <Select.Portal>
        <Select.Positioner
          side="top"
          align="start"
          sideOffset={8}
          className="isolate z-50"
        >
          <Select.Popup className="dropdown-glass w-52 origin-bottom-left overflow-hidden rounded-xl p-1">
            <Select.List aria-label="Reasoning effort">
              {availableOptions.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-foreground",
                    "transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                    "data-selected:bg-accent/70"
                  )}
                >
                  <ReasoningEffortIcon
                    option={option}
                    className="size-4 shrink-0"
                  />
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
