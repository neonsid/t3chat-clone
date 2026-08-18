import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import {
  EllipsisIcon,
  LayoutGridIcon,
  LayoutListIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react"
import { MODEL_CATALOG } from "@t3chat/model-catalog"
import type { ModelCapability } from "@t3chat/model-catalog"

import { ModelsFilterMenu } from "@/components/settings/ModelsFilterMenu"
import { ModelsGrid } from "@/components/settings/ModelsGrid"
import { ModelsList, ModelsListEmpty } from "@/components/settings/ModelsList"
import {
  MODELS_PAGE,
  MODELS_RECOMMENDED_IDS,
  type ModelsAccessFilter,
  type ModelsView,
} from "@/components/settings/constants"
import {
  filterSettingsModels,
  formatNewModelsBanner,
  getNewestCatalogModels,
  toggleIdInList,
} from "@/components/settings/logic"
import { Button } from "@/components/shared/ui/button"
import { Input } from "@/components/shared/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import { cn } from "@/lib/utils"

const newestModels = getNewestCatalogModels(
  MODEL_CATALOG,
  MODELS_PAGE.newCount
)
const newestIds = new Set(newestModels.map((model) => model.id))
const newBanner = formatNewModelsBanner(newestModels)

export function ModelsSettings() {
  const [search, setSearch] = useState("")
  const [capabilities, setCapabilities] = useState<Array<ModelCapability>>([])
  const [access, setAccess] = useState<ModelsAccessFilter>("all")
  const [view, setView] = useState<ModelsView>("list")
  const [selectedIds, setSelectedIds] = useState<Array<string>>(() => [
    ...MODELS_RECOMMENDED_IDS,
  ])
  const [favoriteIds, setFavoriteIds] = useState<Array<string>>([])

  const visibleModels = useMemo(
    () =>
      filterSettingsModels(MODEL_CATALOG, {
        search,
        capabilities,
        access,
      }),
    [access, capabilities, search]
  )
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {MODELS_PAGE.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {MODELS_PAGE.description}
          </p>
        </div>
        <ModelsActionsMenu
          onSelectRecommended={() =>
            setSelectedIds([...MODELS_RECOMMENDED_IDS])
          }
          onUnselectAll={() => setSelectedIds([])}
        />
      </div>

      {newBanner ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
          <SparklesIcon className="mt-0.5 size-4 shrink-0 fill-amber-400 text-amber-400" />
          <p>{newBanner}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={MODELS_PAGE.searchPlaceholder}
            aria-label={MODELS_PAGE.searchLabel}
            className="rounded-md border-border bg-transparent pl-9"
          />
        </div>
        <ModelsFilterMenu
          activeCapabilities={capabilities}
          access={access}
          onToggleCapability={(capability) =>
            setCapabilities(
              capabilities.includes(capability)
                ? capabilities.filter((item) => item !== capability)
                : [...capabilities, capability]
            )
          }
          onAccessChange={setAccess}
        />
        <div className="flex items-center rounded-md border border-border p-0.5">
          <ViewToggleButton
            label={MODELS_PAGE.listView}
            pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <LayoutListIcon />
          </ViewToggleButton>
          <ViewToggleButton
            label={MODELS_PAGE.gridView}
            pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <LayoutGridIcon />
          </ViewToggleButton>
        </div>
      </div>

      {visibleModels.length === 0 ? (
        <ModelsListEmpty />
      ) : view === "list" ? (
        <ModelsList
          models={visibleModels}
          selectedIds={selectedIdSet}
          favoriteIds={favoriteIdSet}
          newestIds={newestIds}
          onToggleSelected={(id) =>
            setSelectedIds(toggleIdInList(selectedIds, id))
          }
          onToggleFavorite={(id) =>
            setFavoriteIds(toggleIdInList(favoriteIds, id))
          }
        />
      ) : (
        <ModelsGrid
          models={visibleModels}
          selectedIds={selectedIdSet}
          favoriteIds={favoriteIdSet}
          newestIds={newestIds}
          onToggleSelected={(id) =>
            setSelectedIds(toggleIdInList(selectedIds, id))
          }
          onToggleFavorite={(id) =>
            setFavoriteIds(toggleIdInList(favoriteIds, id))
          }
        />
      )}
    </div>
  )
}

function ModelsActionsMenu({
  onSelectRecommended,
  onUnselectAll,
}: {
  onSelectRecommended: () => void
  onUnselectAll: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={MODELS_PAGE.moreLabel}
            className="rounded-md text-muted-foreground hover:text-foreground"
          />
        }
      >
        <EllipsisIcon />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-48 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md"
      >
        <button
          type="button"
          onClick={() => {
            onSelectRecommended()
            setOpen(false)
          }}
          className="flex h-9 w-full cursor-pointer items-center rounded-md px-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        >
          {MODELS_PAGE.selectRecommended}
        </button>
        <button
          type="button"
          onClick={() => {
            onUnselectAll()
            setOpen(false)
          }}
          className="flex h-9 w-full cursor-pointer items-center rounded-md px-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        >
          {MODELS_PAGE.unselectAll}
        </button>
      </PopoverContent>
    </Popover>
  )
}

function ViewToggleButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-md text-muted-foreground hover:text-foreground",
        pressed && "bg-accent text-foreground"
      )}
    >
      {children}
    </Button>
  )
}
