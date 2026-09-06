import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Dialog } from "@base-ui/react/dialog"
import {
  CopyIcon,
  EyeIcon,
  GitForkIcon,
  PlusIcon,
  Trash2Icon,
  WandSparklesIcon,
  XIcon,
} from "lucide-react"

import { api } from "../../../../convex/_generated/api"
import { THREAD_SHARE } from "@/components/chat/share/constants"
import { Button } from "@/components/shared/ui/button"
import { Switch } from "@/components/shared/ui/switch"
import { asShareId, asThreadId } from "@/lib/convex-ids"
import { hasWindow } from "@/lib/runtime-env"
import { formatShareAge, sharePath, shareUrl } from "@/lib/share-id"
import { cn } from "@/lib/utils"

type ShareThreadDialogProps = {
  open: boolean
  threadId: string | null
  threadTitle: string
  onOpenChange: (open: boolean) => void
}

function shareErrorMessage(error: Error) {
  return error.message || THREAD_SHARE.createFailed
}

export function ShareThreadDialog({
  open,
  threadId,
  threadTitle,
  onOpenChange,
}: ShareThreadDialogProps) {
  const shares = useQuery(
    api.threadShares.listForThread,
    open && threadId ? { threadId: asThreadId(threadId) } : "skip"
  )
  const createShare = useMutation(api.threadShares.create)
  const updateShare = useMutation(api.threadShares.update)
  const refreshSnapshot = useMutation(api.threadShares.refreshSnapshot)
  const removeShare = useMutation(api.threadShares.remove)
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [autoCreateFailed, setAutoCreateFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) return
    setAutoCreateFailed(false)
    setError(null)
    setSelectedShareId(null)
    setCopied(false)
  }, [open])

  useEffect(() => {
    if (!open || !threadId || shares === undefined || creating || autoCreateFailed)
      return
    if (shares.length > 0) return
    setCreating(true)
    void createShare({ threadId: asThreadId(threadId) })
      .then(
        () => undefined,
        (error: Error) => {
          setAutoCreateFailed(true)
          setError(shareErrorMessage(error))
        }
      )
      .finally(() => {
        setCreating(false)
      })
  }, [autoCreateFailed, createShare, creating, open, shares, threadId])

  const selectedShare = useMemo(() => {
    if (!shares || shares.length === 0) return null
    return (
      shares.find((share) => share._id === selectedShareId) ?? shares[0] ?? null
    )
  }, [selectedShareId, shares])

  const origin = hasWindow() ? window.location.origin : ""
  const selectedUrl = selectedShare
    ? shareUrl(origin, selectedShare.publicId)
    : ""

  async function copySelected() {
    if (!selectedUrl) return
    await navigator.clipboard.writeText(selectedUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[200] bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[200] flex max-h-[min(40rem,calc(100vh-2rem))] w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-border bg-card p-6 text-card-foreground shadow-lg outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">
              {THREAD_SHARE.title(threadTitle || "chat")}
            </Dialog.Title>
            <Dialog.Close
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={THREAD_SHARE.close}
                  className="rounded-md text-muted-foreground hover:text-foreground"
                />
              }
            >
              <XIcon />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {THREAD_SHARE.description}
          </Dialog.Description>
          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-md"
              disabled={!threadId || creating}
              onClick={() => {
                if (!threadId) return
                void createShare({ threadId: asThreadId(threadId) }).then(
                  () => undefined,
                  (error: Error) => {
                    setError(shareErrorMessage(error))
                  }
                )
              }}
            >
              <PlusIcon />
              {THREAD_SHARE.newLink}
            </Button>
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto">
            {shares?.map((share) => {
              const isSelected = share._id === selectedShare?._id
              return (
                <ShareLinkCard
                  key={share._id}
                  url={shareUrl(origin, share.publicId)}
                  path={sharePath(share.publicId)}
                  createdAt={share.createdAt}
                  viewCount={share.viewCount}
                  forkCount={share.forkCount}
                  autoUpdate={share.autoUpdate}
                  includeAttachments={share.includeAttachments}
                  selected={isSelected}
                  onSelect={() => setSelectedShareId(share._id)}
                  onCopy={() => {
                    setSelectedShareId(share._id)
                    void navigator.clipboard.writeText(
                      shareUrl(origin, share.publicId)
                    )
                  }}
                  onRefresh={() =>
                    void refreshSnapshot({
                      shareId: asShareId(share._id),
                    })
                  }
                  onAutoUpdate={(autoUpdate) =>
                    void updateShare({
                      shareId: asShareId(share._id),
                      autoUpdate,
                    })
                  }
                  onIncludeAttachments={(includeAttachments) =>
                    void updateShare({
                      shareId: asShareId(share._id),
                      includeAttachments,
                    })
                  }
                  onDelete={() =>
                    void removeShare({
                      shareId: asShareId(share._id),
                    })
                  }
                />
              )
            })}
          </div>

          <Button
            type="button"
            className="mt-4 w-full rounded-md"
            disabled={!selectedShare}
            onClick={() => void copySelected()}
          >
            <CopyIcon />
            {copied ? THREAD_SHARE.copied : THREAD_SHARE.copyLink}
          </Button>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ShareLinkCard({
  url,
  path,
  createdAt,
  viewCount,
  forkCount,
  autoUpdate,
  includeAttachments,
  selected,
  onSelect,
  onCopy,
  onRefresh,
  onAutoUpdate,
  onIncludeAttachments,
  onDelete,
}: {
  url: string
  path: string
  createdAt: number
  viewCount: number
  forkCount: number
  autoUpdate: boolean
  includeAttachments: boolean
  selected: boolean
  onSelect: () => void
  onCopy: () => void
  onRefresh: () => void
  onAutoUpdate: (autoUpdate: boolean) => void
  onIncludeAttachments: (includeAttachments: boolean) => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/30 p-3",
        selected && "ring-1 ring-primary/40"
      )}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer items-start justify-between gap-3 text-left"
        onClick={onSelect}
      >
        <a
          href={url}
          className="min-w-0 truncate text-sm text-primary underline underline-offset-4"
          onClick={(event) => event.stopPropagation()}
        >
          {hasWindow() ? `${window.location.host}${path}` : path}
        </a>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatShareAge(createdAt, Date.now())}
        </span>
      </button>

      <div className="mt-2 flex items-center gap-3">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <EyeIcon className="size-3.5" aria-hidden="true" />
          <span className="sr-only">{THREAD_SHARE.views}</span>
          {viewCount}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <GitForkIcon className="size-3.5" aria-hidden="true" />
          <span className="sr-only">{THREAD_SHARE.forks}</span>
          {forkCount}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={THREAD_SHARE.copyUrl}
            className="rounded-md"
            onClick={onCopy}
          >
            <CopyIcon />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={THREAD_SHARE.refreshSnapshot}
            className="rounded-md"
            disabled={autoUpdate}
            onClick={onRefresh}
          >
            <WandSparklesIcon />
          </Button>
        </div>
      </div>

      <label className="mt-3 flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-medium">{THREAD_SHARE.autoUpdate}</span>
          <span className="block text-xs text-muted-foreground">
            {THREAD_SHARE.autoUpdateDescription}
          </span>
        </span>
        <Switch checked={autoUpdate} onCheckedChange={onAutoUpdate} />
      </label>

      <label className="mt-3 flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-medium">
            {THREAD_SHARE.includeAttachments}
          </span>
          <span className="block text-xs text-muted-foreground">
            {THREAD_SHARE.includeAttachmentsDescription}
          </span>
        </span>
        <Switch
          checked={includeAttachments}
          onCheckedChange={onIncludeAttachments}
        />
      </label>

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="rounded-md"
          onClick={onDelete}
        >
          <Trash2Icon />
          {THREAD_SHARE.delete}
        </Button>
      </div>
    </div>
  )
}
