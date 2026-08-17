import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type SwitchProps = Omit<
  ComponentProps<"button">,
  "onChange" | "role" | "type"
> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="switch"
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input p-0.5 transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        "data-[state=checked]:bg-primary",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}

export { Switch }
