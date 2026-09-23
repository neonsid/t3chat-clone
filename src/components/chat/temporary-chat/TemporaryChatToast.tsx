import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react"

import type { AnimatedToast } from "@/components/shared/motion/animated-toast-stack"
import { EASE_OUT } from "@/lib/ease"

const TOAST_SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.75,
}

export function TemporaryChatToast({ toasts }: { toasts: AnimatedToast[] }) {
  const visibleToast = toasts.at(-1)

  return (
    <div className="chat-shell-toast-anchor">
      <ol
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none relative z-10 w-80 max-w-[calc(100vw-2rem)]"
      >
        <AnimatePresence initial={false}>
          {visibleToast ? (
            <TemporaryChatToastItem
              key={visibleToast.id}
              toast={visibleToast}
            />
          ) : null}
        </AnimatePresence>
      </ol>
    </div>
  )
}

function TemporaryChatToastItem({ toast }: { toast: AnimatedToast }) {
  const reduce = useReducedMotion()
  const status = toast.status ?? "neutral"

  return (
    <motion.li
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={
        reduce
          ? { opacity: 0 }
          : {
              opacity: 0,
              y: 8,
              transition: { duration: 0.16, ease: EASE_OUT },
            }
      }
      transition={TOAST_SPRING}
    >
      <div className="flex w-full items-center gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-lg">
        {status === "loading" ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-foreground" />
        ) : null}
        {status === "error" ? (
          <CircleAlert className="size-4 shrink-0 text-foreground" />
        ) : null}
        {status !== "loading" && status !== "error" ? (
          <CircleCheck className="size-4 shrink-0 text-foreground" />
        ) : null}
        <p className="min-w-0 truncate text-sm leading-5 font-medium text-foreground">
          {toast.title}
        </p>
      </div>
    </motion.li>
  )
}
