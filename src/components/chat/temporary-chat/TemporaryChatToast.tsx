import { CircleAlert, CircleCheck, X } from "lucide-react"
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
import { CHAT_COMPOSER_OVERLAY_HEIGHT } from "@/components/chat/composer/constants"
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
  onDismiss,
}: {
  toasts: AnimatedToast[]
  onDismiss?: (id: string) => void
}) {
  const visibleToast = toasts.at(-1)

  return (
    <div
      className={TEMPORARY_CHAT_TOAST_ANCHOR_CLASS}
      style={{
        bottom: `var(${CHAT_COMPOSER_OVERLAY_HEIGHT.cssVar}, ${CHAT_COMPOSER_OVERLAY_HEIGHT.fallbackPx}px)`,
      }}
    >
      <ol
        aria-live="polite"
        aria-atomic="false"
        className={TEMPORARY_CHAT_TOAST_STACK_CLASS}
      >
        <AnimatePresence initial={false}>
          {visibleToast ? (
            <TemporaryChatToastItem
              key={visibleToast.id}
              toast={visibleToast}
              onDismiss={onDismiss}
            />
          ) : null}
        </AnimatePresence>
      </ol>
    </div>
  )
}

function TemporaryChatToastItem({
  toast,
  onDismiss,
}: {
  toast: AnimatedToast
  onDismiss?: (id: string) => void
}) {
  const reduce = useReducedMotion()
  const status = toast.status ?? "neutral"
  const canDismiss = toast.dismissible !== false && Boolean(onDismiss)

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
      className="pointer-events-auto"
    >
      <div className={TEMPORARY_CHAT_TOAST_ITEM_CLASS}>
        {status === "error" ? (
          <CircleAlert className="size-4 shrink-0 text-foreground" />
        ) : (
          <CircleCheck className="size-4 shrink-0 text-foreground" />
        )}
        <p className="min-w-0 truncate text-sm leading-none font-medium text-foreground">
          {toast.title}
        </p>
        {canDismiss ? (
          <button
            type="button"
            onClick={() => onDismiss?.(toast.id)}
            aria-label="Dismiss toast"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </motion.li>
  )
}
