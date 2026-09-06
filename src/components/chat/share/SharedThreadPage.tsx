import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react"
import { Link, useNavigate } from "@tanstack/react-router"
import { GitForkIcon } from "lucide-react"

import { api } from "../../../../convex/_generated/api"
import { THREAD_SHARE } from "@/components/chat/share/constants"
import { ChatMessage } from "@/components/chat/thread/ChatMessage"
import { Button } from "@/components/shared/ui/button"
import { SIGN_IN_PATH } from "@/lib/auth"
import { hasWindow } from "@/lib/runtime-env"
import {
  shareViewedStorageKey,
  toShareAttachments,
  toShareGenerationStats,
  toShareUiMessage,
} from "@/lib/share-thread"
import { sharePath } from "@/lib/share-id"

export function SharedThreadPage({ publicId }: { publicId: string }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useConvexAuth()
  const share = useQuery(api.threadShares.getByPublicId, { publicId })
  const recordView = useMutation(api.threadShares.recordView)
  const forkFromShare = useMutation(api.threadShares.forkFromShare)
  const getShareDownloadUrl = useAction(api.r2.getShareDownloadUrl)
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>(
    {}
  )
  const [forking, setForking] = useState(false)
  const [forkError, setForkError] = useState<string | null>(null)

  const attachmentIds = useMemo(() => {
    if (!share?.includeAttachments) return []
    return [
      ...new Set(
        share.messages.flatMap((message) =>
          message.attachments.map((attachment) => attachment.attachmentId)
        )
      ),
    ]
  }, [share])
  const attachmentKey = attachmentIds.join(",")

  useEffect(() => {
    if (!share) return
    if (!hasWindow()) return
    const key = shareViewedStorageKey(share.publicId)
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
    void recordView({ publicId: share.publicId })
  }, [recordView, share])

  useEffect(() => {
    if (!share?.includeAttachments || attachmentKey.length === 0) {
      setAttachmentUrls({})
      return
    }

    let cancelled = false
    void Promise.all(
      attachmentKey.split(",").map(async (attachmentId) => {
        try {
          const result = await getShareDownloadUrl({
            publicId,
            attachmentId,
          })
          return [attachmentId, result.url] as const
        } catch {
          return null
        }
      })
    ).then((entries) => {
      if (cancelled) return
      const next: Record<string, string> = {}
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1]
      }
      setAttachmentUrls(next)
    })

    return () => {
      cancelled = true
    }
  }, [attachmentKey, getShareDownloadUrl, publicId, share?.includeAttachments])

  async function handleFork() {
    if (forking) return
    if (!isAuthenticated) {
      void navigate({
        to: SIGN_IN_PATH,
        search: { redirect_url: sharePath(publicId) },
      })
      return
    }

    setForking(true)
    setForkError(null)
    try {
      const threadId = await forkFromShare({ publicId })
      await navigate({
        to: "/chat/$threadId",
        params: { threadId },
      })
    } catch (error) {
      setForkError(
        error instanceof Error && error.message
          ? error.message
          : THREAD_SHARE.forkFailed
      )
      setForking(false)
    }
  }

  if (share === undefined) {
    return (
      <SharePageFrame>
        <p className="text-sm text-muted-foreground">{THREAD_SHARE.loading}</p>
      </SharePageFrame>
    )
  }

  if (share === null) {
    return (
      <SharePageFrame>
        <h1 className="text-2xl font-semibold tracking-tight">
          {THREAD_SHARE.notFoundTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {THREAD_SHARE.notFoundDescription}
        </p>
      </SharePageFrame>
    )
  }

  return (
    <SharePageFrame
      title={share.title}
      onFork={() => void handleFork()}
      forking={forking}
    >
      {share.messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">{THREAD_SHARE.empty}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {share.messages.map((message) => (
            <ChatMessage
              key={message.messageId}
              message={toShareUiMessage(message)}
              isStopped={message.status === "stopped"}
              generationStats={
                message.generation
                  ? toShareGenerationStats(message.generation)
                  : undefined
              }
              attachments={toShareAttachments(
                message.attachments,
                attachmentUrls
              )}
              sources={message.sources}
              queries={message.searchQueries}
              thinkingSearchSplitAt={message.thinkingSearchSplitAt}
              readOnly
            />
          ))}
        </div>
      )}
      {forkError ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {forkError}
        </p>
      ) : null}
    </SharePageFrame>
  )
}

function SharePageFrame({
  title,
  forking = false,
  onFork,
  children,
}: {
  title?: string
  forking?: boolean
  onFork?: () => void
  children: ReactNode
}) {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {THREAD_SHARE.backToChat}
        </Link>
        {onFork ? (
          <Button
            type="button"
            className="rounded-md"
            disabled={forking}
            onClick={onFork}
          >
            <GitForkIcon />
            {forking ? THREAD_SHARE.forking : THREAD_SHARE.fork}
          </Button>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {title ? (
            <h1 className="mb-8 text-2xl font-semibold tracking-tight">
              {title}
            </h1>
          ) : null}
          {children}
        </div>
      </div>
    </main>
  )
}
