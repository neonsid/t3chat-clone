import { useState } from "react"
import { ChevronDownIcon, StarIcon } from "lucide-react"
import type { ModelProviderId } from "@t3chat/model-catalog"

import {
  INITIAL_MODEL_PICKER_RAIL_SCROLL_STATE,
  MODEL_PICKER_RAIL_END_CUE_FADE_DISTANCE,
  MODEL_PICKER_RAIL_TAB_CLASS_NAME,
} from "@/components/chat/model-picker/constants"
import { ProviderLogo } from "@/components/chat/model-picker/ProviderLogo"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { Separator } from "@/components/shared/ui/separator"
import type { ModelRailTab } from "@/stores/model-picker-store"
import { cn } from "@/lib/utils"

type ModelPickerRailProvider = {
  id: ModelProviderId
  name: string
}

type ModelPickerRailProps = {
  providers: ReadonlyArray<ModelPickerRailProvider>
  activeTab: ModelRailTab
  onSelectTab: (tab: ModelRailTab) => void
  hidden: boolean
}

type RailScrollState = {
  overflowing: boolean
  endCueOpacity: number
}

export function ModelPickerRail({
  providers,
  activeTab,
  onSelectTab,
  hidden,
}: ModelPickerRailProps) {
  const [scroll, setScroll] = useState<RailScrollState>(
    INITIAL_MODEL_PICKER_RAIL_SCROLL_STATE
  )

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
      endCueOpacity: Math.min(
        distanceToEnd / MODEL_PICKER_RAIL_END_CUE_FADE_DISTANCE,
        1
      ),
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
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={cn(
        "relative flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-tr-3xl border-t border-r border-border transition-[width,opacity,transform,border-color] duration-200 ease-out motion-reduce:transition-none",
        hidden && "pointer-events-none w-0 -translate-x-2 border-0 opacity-0"
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
          className={MODEL_PICKER_RAIL_TAB_CLASS_NAME}
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
                className={MODEL_PICKER_RAIL_TAB_CLASS_NAME}
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
