import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { EllipsisIcon, Trash2Icon } from "lucide-react"

import { api } from "../../../convex/_generated/api"
import { ShareThreadDialog } from "@/components/chat/share/ShareThreadDialog"
import { HistoryThreadList } from "@/components/settings/HistoryThreadList"
import {
  SharedThreadsSection,
  type SharedThreadItem,
} from "@/components/settings/SharedThreadsSection"
import {
  HISTORY_DANGER_ZONE,
  HISTORY_MOCK_THREADS,
  HISTORY_PAGE,
  type HistoryMockThread,
} from "@/components/settings/constants"
import { removeIds } from "@/components/settings/logic"
import { Button } from "@/components/shared/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import { asShareId } from "@/lib/convex-ids"
import { hasWindow } from "@/lib/runtime-env"
import { shareUrl } from "@/lib/share-id"

export function HistorySettings() {
  const [threads, setThreads] = useState<Array<HistoryMockThread>>(() => [
    ...HISTORY_MOCK_THREADS,
  ])
  const ownedShares = useQuery(api.threadShares.listByOwner)
  const removeShare = useMutation(api.threadShares.remove)
  const [selectedIds, setSelectedIds] = useState<Array<string>>([])
  const [shareThreadId, setShareThreadId] = useState<string | null>(null)
  const [shareTitle, setShareTitle] = useState("")

  const sharedThreads = useMemo<Array<SharedThreadItem>>(() => {
    if (!ownedShares) return []
    const origin = hasWindow() ? window.location.origin : ""
    return ownedShares.map((group) => ({
      id: group.threadId,
      title: group.title,
      shares: group.shares.map((share) => ({
        id: share._id,
        publicId: share.publicId,
        url: shareUrl(origin, share.publicId),
        forkCount: share.forkCount,
        viewCount: share.viewCount,
        createdAt: share.createdAt,
      })),
    }))
  }, [ownedShares])

  function handleRemove(ids: ReadonlyArray<string>) {
    setThreads(removeIds(threads, ids))
    setSelectedIds(selectedIds.filter((id) => !ids.includes(id)))
  }

  function handleRemoveShared(ids: ReadonlyArray<string>) {
    void Promise.all(
      ids.map((id) => removeShare({ shareId: asShareId(id) }))
    )
  }

  function handleDeleteAllHistory() {
    const confirmed = window.confirm(HISTORY_DANGER_ZONE.confirm)
    if (!confirmed) return
    setThreads([])
    setSelectedIds([])
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {HISTORY_PAGE.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {HISTORY_PAGE.description}
            </p>
          </div>
          <HistoryActionsMenu selectedCount={selectedIds.length} />
        </div>
        <HistoryThreadList
          threads={threads}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onArchive={handleRemove}
          onDelete={handleRemove}
        />
      </div>

      {ownedShares !== undefined ? (
        <SharedThreadsSection
          threads={sharedThreads}
          onDelete={handleRemoveShared}
          onEdit={(threadId, title) => {
            setShareThreadId(threadId)
            setShareTitle(title)
          }}
        />
      ) : null}

      <HistoryDangerZone onDelete={handleDeleteAllHistory} />
      <ShareThreadDialog
        open={shareThreadId != null}
        threadId={shareThreadId}
        threadTitle={shareTitle}
        onOpenChange={(open) => {
          if (!open) setShareThreadId(null)
        }}
      />
    </div>
  )
}

function HistoryDangerZone({ onDelete }: { onDelete: () => void }) {
  return (
    <section className="rounded-2xl border border-border px-5 py-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {HISTORY_DANGER_ZONE.title}
      </h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        {HISTORY_DANGER_ZONE.description}
      </p>
      <Button
        type="button"
        variant="destructive"
        className="mt-4 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={onDelete}
      >
        <Trash2Icon />
        {HISTORY_DANGER_ZONE.action}
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">
        {HISTORY_DANGER_ZONE.note}
      </p>
    </section>
  )
}

function HistoryActionsMenu({ selectedCount }: { selectedCount: number }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={HISTORY_PAGE.moreLabel}
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
        <HistoryMenuItem
          label={HISTORY_PAGE.import}
          onSelect={() => setOpen(false)}
        />
        <HistoryMenuItem
          label={HISTORY_PAGE.exportSelected}
          disabled={selectedCount === 0}
          onSelect={() => setOpen(false)}
        />
        <HistoryMenuItem
          label={HISTORY_PAGE.export}
          onSelect={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

function HistoryMenuItem({
  label,
  disabled,
  onSelect,
}: {
  label: string
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="flex h-9 w-full cursor-pointer items-center rounded-md px-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  )
}
