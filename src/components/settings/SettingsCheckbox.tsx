import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function SettingsCheckbox({
  checked,
  onCheckedChange,
  ariaLabel,
  indeterminate = false,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  ariaLabel: string
  indeterminate?: boolean
}) {
  const filled = checked || indeterminate

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex size-[1.125rem] shrink-0 cursor-pointer items-center justify-center rounded-[4px] border transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
        filled
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/60 bg-transparent"
      )}
    >
      {indeterminate ? (
        <MinusIcon className="size-3" aria-hidden="true" />
      ) : checked ? (
        <CheckIcon className="size-3" aria-hidden="true" />
      ) : null}
    </button>
  )
}
