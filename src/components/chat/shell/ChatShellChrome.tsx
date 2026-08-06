import type { ReactNode } from "react"
import { ClockIcon, PlusIcon, SearchIcon } from "lucide-react"
import * as m from "motion/react-m"

import {
  CHAT_CONTROL_BUTTON_CLASS,
  CHAT_HEADER_NOTCH_FILL,
  CHAT_HEADER_NOTCH_RIGHT,
  CHAT_HEADER_NOTCH_STROKE,
  CHAT_NOTCH_BUTTON_CLASS,
} from "@/components/chat/shell/constants"
import { SettingsMenu } from "@/components/settings/SettingsMenu"
import { Button } from "@/components/shared/ui/button"
import { SidebarTrigger, useSidebar } from "@/components/shared/ui/sidebar"
import { cn } from "@/lib/utils"

/**
 * Chrome buttons hover against either the chrome-surface chip or the near-black
 * gutter depending on sidebar state, so the lift stays translucent to read on
 * both. The opaque `accent` the button variant defaults to sits only three
 * values above the chip and disappears against it.
 */
export function SidebarControl({
  hasConversation,
  onCreateThread,
}: {
  hasConversation: boolean
  onCreateThread: () => void
}) {
  const { open } = useSidebar()
  const highlightedIconClass = "[&_svg]:stroke-foreground"
  const highlightedPlusIconClass = hasConversation && highlightedIconClass
  return (
    <div
      className={cn(
        "pointer-events-none fixed top-3 left-3 z-60 flex items-center gap-0.5",
        !open && "rounded-md bg-chrome-surface ring-4 ring-chrome-surface"
      )}
    >
      <SidebarTrigger
        className={cn(
          "pointer-events-auto text-muted-foreground hover:rounded-md",
          "hover:bg-sidebar-accent hover:text-foreground",
          highlightedIconClass
        )}
      />
      {!open && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Search"
            className={cn(CHAT_CONTROL_BUTTON_CLASS, highlightedIconClass)}
          >
            <SearchIcon />
          </Button>
          <m.div
            className="pointer-events-auto size-8"
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 16 }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="New chat"
              className={cn(
                CHAT_CONTROL_BUTTON_CLASS,
                highlightedPlusIconClass
              )}
              onClick={onCreateThread}
            >
              <PlusIcon />
            </Button>
          </m.div>
        </>
      )}
    </div>
  )
}

/**
 * The curve has to break just left of the header buttons, so the notch is
 * anchored to the right edge of the canvas: 0.75rem of gutter + 4.125rem of
 * buttons + the 3.5rem lead-in the path needs before the S bend, less the
 * 11rem the element is wide. The flat tail runs off the right edge.
 */
function ChatHeaderNotch() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 128 32"
      style={{ right: CHAT_HEADER_NOTCH_RIGHT }}
      className="pointer-events-none absolute -top-px h-11 w-44 origin-top-left skew-x-[30deg] overflow-visible"
    >
      <path
        d="M0,0c5.9,0,10.7,4.8,10.7,10.7v10.7c0,5.9,4.8,10.7,10.7,10.7H128V0Z"
        fill={CHAT_HEADER_NOTCH_FILL}
      />
      <path
        d="M0,0c5.9,0,10.7,4.8,10.7,10.7v10.7c0,5.9,4.8,10.7,10.7,10.7H128"
        fill="none"
        stroke={CHAT_HEADER_NOTCH_STROKE}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function ChatShellEdge({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-50 border-t border-l border-border transition-[opacity,border-radius] duration-200 ease-linear",
        visible ? "rounded-tl-2xl opacity-100" : "opacity-0"
      )}
    >
      <ChatHeaderNotch />
    </div>
  )
}

/**
 * Off the notch the buttons need their own chip to stand off the canvas; on it
 * the notch already supplies the surface, so the chip dissolves and the row
 * drops 8px into the notch band. Motion drives this because it is a mount-free
 * crossfade with no CSS transition of its own to stay in step with.
 */
export function ChatHeaderActions() {
  const { isMobile, open } = useSidebar()
  const onNotch = open && !isMobile

  return (
    <div className="pointer-events-none fixed top-[10px] right-3 z-60">
      <m.div
        className="rounded-lg p-1"
        initial={false}
        animate={{
          y: onNotch ? 8 : 0,
          backgroundColor: onNotch ? "transparent" : "var(--chrome-surface)",
        }}
        transition={{ duration: 0.2, ease: "linear" }}
      >
        <m.div
          className="flex items-center gap-0.5"
          initial={false}
          animate={{ x: onNotch ? 4 : 0, y: onNotch ? -4 : 0 }}
          transition={{ duration: 0.2, ease: "linear" }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="History"
            className={CHAT_NOTCH_BUTTON_CLASS}
          >
            <ClockIcon />
          </Button>
          <SettingsMenu triggerClassName={CHAT_NOTCH_BUTTON_CLASS} />
        </m.div>
      </m.div>
    </div>
  )
}

export function ChatShell({ children }: { children: ReactNode }) {
  const { isMobile, open } = useSidebar()
  const showSidebarEdge = open && !isMobile

  return (
    <div
      data-chat-shell=""
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 transition-[margin] duration-200 ease-linear",
        showSidebarEdge && "mt-3"
      )}
    >
      <div
        className={cn(
          "relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background transition-[border-radius] duration-200 ease-linear",
          showSidebarEdge && "rounded-tl-2xl"
        )}
      >
        {children}
      </div>
      <ChatShellEdge visible={showSidebarEdge} />
    </div>
  )
}
