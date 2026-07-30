import { useState } from "react"
import { ChevronDownIcon, StarIcon } from "lucide-react"
import type { ModelProviderId } from "@t3chat/model-catalog"

import { ProviderLogo } from "@/components/chat/model-picker/ProviderLogo"
import { Tooltip } from "@/components/motion/tooltip"
import { Separator } from "@/components/ui/separator"
import type { ModelRailTab } from "@/lib/model-store"
import { cn } from "@/lib/utils"

type ModelPickerRailProvider = {
  id: ModelProviderId
  name: string
}

type ModelPickerRailProps = {
  providers: ReadonlyArray<ModelPickerRailProvider>
  activeTab: ModelRailTab
  onSelectTab: (tab: ModelRailTab) => void
  /** Rail selection is ignored while combined results are on. */
  dimmed: boolean
}

const RAIL_TAB_CLASS_NAME =
  "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,transform] hover:scale-105 hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none data-active:text-white"

type RailScrollState = {
  overflowing: boolean
  endCueOpacity: number
}

const INITIAL_SCROLL_STATE: RailScrollState = {
  overflowing: false,
  endCueOpacity: 0,
}

/** Ease the bottom cue out as the final row scrolls into view. */
const END_CUE_FADE_DISTANCE = 48

export function ModelPickerRail({
  providers,
  activeTab,
  onSelectTab,
  dimmed,
}: ModelPickerRailProps) {
  const [scroll, setScroll] = useState(INITIAL_SCROLL_STATE)

  /**
   * Doubles as the ref callback and the scroll handler: React runs ref
   * callbacks on commit, so the rail is measured as soon as the popover mounts
   * without reaching for an effect.
   */
  function measureRail(element: HTMLDivElement | null) {
    if (!element) return
    const distanceToEnd = Math.max(
      element.scrollHeight - element.clientHeight - element.scrollTop,
      0
    )
    const next: RailScrollState = {
      overflowing: element.scrollHeight > element.clientHeight + 1,
      endCueOpacity: Math.min(distanceToEnd / END_CUE_FADE_DISTANCE, 1),
    }
    setScroll((current) =>
      current.overflowing === next.overflowing &&
      current.endCueOpacity === next.endCueOpacity
        ? current
        : next
    )
  }

  return (
    <div
      className={cn(
        "relative flex w-14 shrink-0 flex-col items-center rounded-tr-3xl border-t border-r border-border transition-opacity",
        dimmed && "opacity-45"
      )}
      role="tablist"
      aria-label="Filter by provider"
      aria-orientation="vertical"
    >
      <Tooltip content="Favorites" side="left" wrapperClassName="my-1.5">
        <button
          type="button"
          role="tab"
          aria-label="Favorites"
          aria-selected={activeTab === "favorites"}
          data-active={activeTab === "favorites" || undefined}
          className={RAIL_TAB_CLASS_NAME}
          onClick={() => onSelectTab("favorites")}
        >
          <StarIcon
            className={cn("size-5", activeTab === "favorites" && "fill-white")}
          />
        </button>
      </Tooltip>

      <Separator className="w-6!" />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={measureRail}
          onScroll={(event) => measureRail(event.currentTarget)}
          className="flex min-h-0 flex-1 [scrollbar-width:none] flex-col items-center gap-2 overflow-y-auto py-2 [&::-webkit-scrollbar]:hidden"
        >
          {providers.map((provider) => (
            <Tooltip key={provider.id} content={provider.name} side="left">
              <button
                type="button"
                role="tab"
                aria-label={provider.name}
                aria-selected={activeTab === provider.id}
                data-active={activeTab === provider.id || undefined}
                className={RAIL_TAB_CLASS_NAME}
                onClick={() => onSelectTab(provider.id)}
              >
                <ProviderLogo providerId={provider.id} className="size-6" />
              </button>
            </Tooltip>
          ))}
        </div>

        {scroll.overflowing ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-center bg-[linear-gradient(to_bottom,transparent,var(--background))] [mask-image:linear-gradient(to_bottom,transparent,#000_40%)] pb-1 backdrop-blur-[4px] transition-opacity duration-200"
            style={{ opacity: scroll.endCueOpacity }}
          >
            <span className="inline-flex size-6 animate-bounce items-center justify-center rounded-md text-muted-foreground motion-reduce:animate-none">
              <ChevronDownIcon className="size-5" />
            </span>
          </span>
        ) : null}
      </div>
    </div>
  )
}
