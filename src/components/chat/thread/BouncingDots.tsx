import * as m from "motion/react-m"

import { BOUNCING_DOT_INDICES } from "@/components/chat/thread/constants"
import { cn } from "@/lib/utils"

interface BouncingDotsProps {
  className?: string
  label?: string
}

export function BouncingDots({
  className,
  label = "Waiting for response",
}: BouncingDotsProps) {
  return (
    <div
      className={cn("flex h-5 items-center gap-1.5", className)}
      role="status"
      aria-label={label}
    >
      {BOUNCING_DOT_INDICES.map((index) => (
        <m.span
          key={index}
          className="size-2 rounded-full bg-muted-foreground/80"
          animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.25,
          }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
