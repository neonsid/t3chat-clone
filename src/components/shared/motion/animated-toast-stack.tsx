"use client"

import { CircleAlert, CircleCheck, LoaderCircle, X } from "lucide-react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

export type ToastStatus = "neutral" | "info" | "loading" | "success" | "error"

export type AnimatedToast = {
  id: string
  title: ReactNode
  status?: ToastStatus
  duration?: number
  dismissible?: boolean
  createdAt?: number
}

export type ToastInput = Omit<AnimatedToast, "id" | "createdAt"> & {
  id?: string
}

export interface AnimatedToastStackProps {
  toasts: AnimatedToast[]
  onDismiss?: (id: string) => void
}

export interface UseAnimatedToastStackOptions {
  initialToasts?: ToastInput[]
  defaultDuration?: number
  limit?: number
}

const STACK_SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.75,
}

const TOAST_HEIGHT_CLASS = "h-10"

const TOAST_ICON_TOOLTIP = {
  loading: "Uploading",
  success: "Success",
  error: "Failed",
  info: "Info",
  neutral: "Notice",
} as const satisfies Record<ToastStatus, string>

let idSeed = 0

function createToast(
  input: ToastInput,
  defaultDuration: number
): AnimatedToast {
  return {
    duration: defaultDuration,
    dismissible: true,
    ...input,
    id: input.id ?? `toast-${Date.now()}-${idSeed++}`,
    createdAt: Date.now(),
  }
}

function StatusIcon({ status }: { status: ToastStatus }) {
  const className = "size-4"
  if (status === "loading") {
    return <LoaderCircle className={`${className} animate-spin`} />
  }
  if (status === "error") {
    return <CircleAlert className={className} />
  }
  return <CircleCheck className={className} />
}

export function useAnimatedToastStack({
  initialToasts = [],
  defaultDuration = 4200,
  limit,
}: UseAnimatedToastStackOptions = {}) {
  const toastTimers = useRef<Map<string, { timer: number; signature: string }>>(
    new Map()
  )
  const [toasts, setToasts] = useState<AnimatedToast[]>(() =>
    initialToasts.map((toast) => createToast(toast, defaultDuration))
  )

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  const showToast = useCallback(
    (input: ToastInput) => {
      const toast = createToast(input, defaultDuration)
      setToasts((current) => {
        const withoutSameId = input.id
          ? current.filter((item) => item.id !== toast.id)
          : current
        const next = [...withoutSameId, toast]
        return limit === undefined ? next : next.slice(-limit)
      })
      return toast.id
    },
    [defaultDuration, limit]
  )

  const updateToast = useCallback((id: string, patch: Partial<ToastInput>) => {
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id
          ? {
              ...toast,
              ...patch,
              id,
              createdAt:
                patch.duration === undefined ? toast.createdAt : Date.now(),
            }
          : toast
      )
    )
  }, [])

  useEffect(() => {
    const activeIds = new Set(toasts.map((toast) => toast.id))

    toastTimers.current.forEach((entry, id) => {
      if (!activeIds.has(id)) {
        window.clearTimeout(entry.timer)
        toastTimers.current.delete(id)
      }
    })

    toasts.forEach((toast) => {
      const duration = toast.duration ?? defaultDuration
      const existing = toastTimers.current.get(toast.id)

      if (duration <= 0) {
        if (existing) {
          window.clearTimeout(existing.timer)
          toastTimers.current.delete(toast.id)
        }
        return
      }

      const createdAt = toast.createdAt ?? Date.now()
      const signature = `${createdAt}:${duration}`

      if (existing?.signature === signature) {
        return
      }

      if (existing) {
        window.clearTimeout(existing.timer)
      }

      const elapsed = Date.now() - createdAt
      const remaining = Math.max(duration - elapsed, 0)
      const timer = window.setTimeout(() => {
        toastTimers.current.delete(toast.id)
        dismissToast(toast.id)
      }, remaining)

      toastTimers.current.set(toast.id, { timer, signature })
    })
  }, [defaultDuration, dismissToast, toasts])

  useEffect(() => {
    const timers = toastTimers.current

    return () => {
      timers.forEach((entry) => {
        window.clearTimeout(entry.timer)
      })
      timers.clear()
    }
  }, [])

  return useMemo(
    () => ({
      toasts,
      showToast,
      updateToast,
      dismissToast,
      clearToasts,
      setToasts,
    }),
    [clearToasts, dismissToast, showToast, toasts, updateToast]
  )
}

export function AnimatedToastStack({
  toasts,
  onDismiss,
}: AnimatedToastStackProps) {
  const visibleToast = toasts.at(-1)

  return (
    <ol
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none absolute right-10 bottom-5 left-0 z-10 mb-0 w-auto translate-y-2 sm:right-[-2.5rem]"
    >
      <AnimatePresence initial={false}>
        {visibleToast ? (
          <ToastItem
            key={visibleToast.id}
            toast={visibleToast}
            onDismiss={onDismiss}
          />
        ) : null}
      </AnimatePresence>
    </ol>
  )
}

const ToastItem = memo(function ToastItem({
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
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={
        reduce
          ? { opacity: 0 }
          : {
              opacity: 0,
              x: 24,
              transition: { duration: 0.18, ease: EASE_OUT },
            }
      }
      transition={STACK_SPRING}
      className={cn("pointer-events-auto w-full", TOAST_HEIGHT_CLASS)}
    >
      <div
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[8px] border border-border bg-card px-4 shadow-lg",
          TOAST_HEIGHT_CLASS
        )}
      >
        <Tooltip content={TOAST_ICON_TOOLTIP[status]}>
          <span className="inline-flex size-4 shrink-0 items-center justify-center text-foreground">
            <StatusIcon status={status} />
          </span>
        </Tooltip>
        <p className="min-w-0 flex-1 truncate text-sm leading-none font-medium text-foreground">
          {toast.title}
        </p>
        {canDismiss ? (
          <button
            type="button"
            onClick={() => onDismiss?.(toast.id)}
            aria-label="Dismiss toast"
            className="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </motion.li>
  )
})
