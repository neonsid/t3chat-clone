import type { ReactNode } from "react"

import { ATTACHMENT_SHELL } from "@/components/chat/attachments/constants"
import { cn } from "@/lib/utils"

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
  return (
    <div
      className={cn(
        ATTACHMENT_SHELL.root,
        failed && ATTACHMENT_SHELL.failed,
        warning && ATTACHMENT_SHELL.warning,
        className
      )}
    >
      {children}
    </div>
  )
}
