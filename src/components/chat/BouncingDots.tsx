import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const DOTS = [0, 1, 2] as const

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
      {DOTS.map((index) => (
        <motion.span
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
