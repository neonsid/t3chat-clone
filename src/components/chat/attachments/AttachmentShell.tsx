import type { ReactNode } from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const attachmentShellVariants = cva(
  "inline-flex max-w-full rounded-md border border-border bg-muted/40 p-2",
  {
    variants: {
      tone: {
        default: "",
        failed: "border-destructive/40",
        warning: "border-amber-500/50",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
)

export function AttachmentShell({
  children,
  failed,
  warning,
  className,
}: {
  children: ReactNode
  failed?: boolean
  warning?: boolean
  className?: string
}) {
  let tone: "default" | "failed" | "warning" = "default"
  if (failed) tone = "failed"
  else if (warning) tone = "warning"

  return (
    <div className={cn(attachmentShellVariants({ tone }), className)}>
      {children}
    </div>
  )
}
