import { useState } from "react"
import type { ReactNode } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import { cn } from "@/lib/utils"

export type SettingsSelectOption = {
  id: string
  label: string
}

export function SettingsSelect({
  value,
  options,
  onValueChange,
  ariaLabel,
  leadingIcon,
  className,
}: {
  value: string
  options: ReadonlyArray<SettingsSelectOption>
  onValueChange: (value: string) => void
  ariaLabel: string
  leadingIcon?: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.id === value)
  const selectedLabel = selected?.label ?? value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
              className
            )}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          {leadingIcon}
          <span className="truncate">{selectedLabel}</span>
        </span>
        <ChevronDownIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-(--anchor-width) min-w-48 rounded-md border border-border bg-popover p-1 shadow-md"
      >
        {options.map((option) => {
          const isSelected = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onValueChange(option.id)
                setOpen(false)
              }}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {option.label}
              {isSelected ? (
                <CheckIcon className="size-3.5 shrink-0" aria-hidden="true" />
              ) : null}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
