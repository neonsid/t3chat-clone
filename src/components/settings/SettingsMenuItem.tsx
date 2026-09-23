import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function SettingsMenuItem({
  label,
  disabled,
  tone = "default",
  onSelect,
  children,
}: {
  label?: string
  disabled?: boolean
  tone?: "default" | "destructive"
  onSelect: () => void
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      className={cn(
        "flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-sm font-medium",
        "transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tone === "destructive" ? "text-destructive" : "text-foreground"
      )}
    >
      {children}
      {label}
    </button>
  )
}

export function SettingsIconButton({
  label,
  onClick,
  children,
  className,
  expanded,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
  className?: string
  expanded?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md",
        "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
        className
      )}
    >
      {children}
    </button>
  )
}
