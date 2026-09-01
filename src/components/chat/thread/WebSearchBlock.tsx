import { memo, useEffect, useState } from "react"
import {
  ChevronDownIcon,
  GlobeIcon,
  LoaderCircleIcon,
  ScanSearchIcon,
} from "lucide-react"

import { WEB_SEARCH_BLOCK } from "@/components/chat/thread/constants"
import { hostnameFromUrl } from "@/lib/web-search"
import type { WebSearchSource } from "@/lib/web-search"
import { cn } from "@/lib/utils"

type WebSearchBlockProps = {
  sources: WebSearchSource[]
  queries: string[]
  isSearching: boolean
}

export const WebSearchBlock = memo(function WebSearchBlock({
  sources,
  queries,
  isSearching,
}: WebSearchBlockProps) {
  const [expanded, setExpanded] = useState(isSearching)
  const [userToggled, setUserToggled] = useState(false)

  useEffect(() => {
    if (userToggled) return
    if (isSearching) setExpanded(true)
  }, [isSearching, userToggled])

  const label = isSearching
    ? WEB_SEARCH_BLOCK.streamingLabel
    : WEB_SEARCH_BLOCK.label
  const showBody =
    expanded && (isSearching || queries.length > 0 || sources.length > 0)

  return (
    <div className="mb-3 w-full min-w-0">
      <button
        type="button"
        aria-busy={isSearching}
        aria-expanded={expanded}
        className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-sm py-1 text-sm text-muted-foreground transition-colors select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
        onClick={() => {
          setUserToggled(true)
          setExpanded((value) => !value)
        }}
      >
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <ScanSearchIcon aria-hidden="true" className="size-4" />
          {isSearching ? (
            <LoaderCircleIcon
              aria-hidden="true"
              className="size-4 animate-spin"
            />
          ) : null}
        </span>
        <span className="min-w-0 truncate font-medium text-foreground/80">
          {label}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 transition-transform duration-200 ease-out",
            expanded && "rotate-180"
          )}
        />
      </button>

      {showBody ? (
        <div className="mt-1 ml-2 border-l border-border/70 pl-4">
          {queries.length > 0 ? (
            <ul className="flex flex-wrap gap-2 pt-1">
              {queries.map((query) => (
                <li
                  key={query}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-sm text-muted-foreground"
                >
                  <GlobeIcon aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{query}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {isSearching ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {WEB_SEARCH_BLOCK.workingLabel}
            </p>
          ) : null}

          {!isSearching && sources.length > 0 ? (
            <ul className="mt-3 overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--foreground)_6%,var(--background))]">
              {sources.map((source) => {
                const hostname = hostnameFromUrl(source.url)
                return (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      {hostname ? (
                        <img
                          src={WEB_SEARCH_BLOCK.faviconUrl(hostname)}
                          alt=""
                          className="size-4 shrink-0 rounded-md"
                        />
                      ) : (
                        <GlobeIcon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {source.title}
                      </span>
                      {hostname ? (
                        <span className="max-w-[40%] shrink-0 truncate text-muted-foreground">
                          {hostname}
                        </span>
                      ) : null}
                    </a>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})
