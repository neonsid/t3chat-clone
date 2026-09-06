import { CircleAlert, CircleCheck } from "lucide-react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react"

import {
  TEMPORARY_CHAT_TOAST_ANCHOR_CLASS,
  TEMPORARY_CHAT_TOAST_ITEM_CLASS,
  TEMPORARY_CHAT_TOAST_STACK_CLASS,
} from "@/components/chat/temporary-chat/constants"
import type { AnimatedToast } from "@/components/shared/motion/animated-toast-stack"
import { EASE_OUT } from "@/lib/ease"

const TOAST_SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.75,
}

export function TemporaryChatToast({
  toasts,
}: {
  toasts: AnimatedToast[]
}) {
  const visibleToast = toasts.at(-1)

  return (
    <div className={TEMPORARY_CHAT_TOAST_ANCHOR_CLASS}>
      <ol
        aria-live="polite"
        aria-atomic="false"
        className={TEMPORARY_CHAT_TOAST_STACK_CLASS}
      >
        <AnimatePresence initial={false}>
          {visibleToast ? (
            <TemporaryChatToastItem key={visibleToast.id} toast={visibleToast} />
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
      <div className={TEMPORARY_CHAT_TOAST_ITEM_CLASS}>
        {status === "error" ? (
          <CircleAlert className="size-4 shrink-0 text-foreground" />
        ) : (
          <CircleCheck className="size-4 shrink-0 text-foreground" />
        )}
        <p className="min-w-0 truncate text-sm leading-5 font-medium text-foreground">
          {toast.title}
        </p>
      </div>
    </motion.li>
  )
}
