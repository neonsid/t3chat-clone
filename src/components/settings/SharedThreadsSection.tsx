import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  GitBranchIcon,
  PencilIcon,
  SquareStackIcon,
  Trash2Icon,
} from "lucide-react";

import { HistoryPagination } from "@/components/settings/HistoryThreadList";
import {
  HISTORY_PAGE,
  HISTORY_PAGE_SIZE,
  SHARED_THREADS_PAGE,
  type SharedMockThread,
} from "@/components/settings/constants";
import {
  getHistoryPage,
  historyActionLabel,
  pageSelection,
  setPageSelected,
  toggleIdInList,
} from "@/components/settings/logic";
import { SettingsCheckbox } from "@/components/settings/SettingsCheckbox";
import { Tooltip } from "@/components/shared/motion/tooltip";
import { Button } from "@/components/shared/ui/button";
import { cn } from "@/lib/utils";

export function SharedThreadsSection({
  threads,
  onDelete,
}: {
  threads: ReadonlyArray<SharedMockThread>;
  onDelete: (ids: ReadonlyArray<string>) => void;
}) {
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Array<string>>([]);
  const [expandedIds, setExpandedIds] = useState<Array<string>>([]);
  const sharedPage = getHistoryPage(threads, page, HISTORY_PAGE_SIZE);
  const pageIds = sharedPage.items.map((thread) => thread.id);
  const selection = pageSelection(pageIds, selectedIds);
  const selectedCount = selectedIds.length;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{SHARED_THREADS_PAGE.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{SHARED_THREADS_PAGE.description}</p>
      </div>

      {threads.length === 0 ? (
        <SharedThreadsEmpty />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
            <SettingsCheckbox
              checked={selection === "all"}
              indeterminate={selection === "some"}
              ariaLabel={SHARED_THREADS_PAGE.selectPage}
              onCheckedChange={(checked) =>
                setSelectedIds(setPageSelected(pageIds, selectedIds, checked))
              }
            />
            <p className="text-sm font-medium text-foreground">{HISTORY_PAGE.titleColumn}</p>
            {selectedCount > 0 ? (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-md"
                  onClick={() => {
                    onDelete(selectedIds);
                    setSelectedIds([]);
                  }}
                >
                  <Trash2Icon />
                  {historyActionLabel(HISTORY_PAGE.delete, selectedCount)}
                </Button>
              </div>
            ) : null}
          </div>
          <ul>
            {sharedPage.items.map((thread) => {
              const selected = selectedIds.includes(thread.id);
              const expanded = expandedIds.includes(thread.id);
              return (
                <li
                  key={thread.id}
                  className="border-b cursor-pointer border-border last:border-b-0"
                >
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
                      selected && "bg-muted/80",
                    )}
                  >
                    <SettingsCheckbox
                      checked={selected}
                      ariaLabel={`${HISTORY_PAGE.selectThread} ${thread.title}`}
                      onCheckedChange={() => setSelectedIds(toggleIdInList(selectedIds, thread.id))}
                    />
                    <Tooltip content={thread.title} side="top" wrapperClassName="min-w-0 flex-1">
                      <p className="w-full min-w-0 truncate text-sm text-foreground">
                        {thread.title}
                      </p>
                    </Tooltip>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={
                        expanded ? SHARED_THREADS_PAGE.collapse : SHARED_THREADS_PAGE.expand
                      }
                      onClick={() => setExpandedIds(toggleIdInList(expandedIds, thread.id))}
                      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                    >
                      {expanded ? (
                        <ChevronUpIcon className="size-4" />
                      ) : (
                        <ChevronDownIcon className="size-4" />
                      )}
                    </button>
                  </div>
                  {expanded
                    ? thread.shares.map((share) => (
                        <SharedThreadShareRow key={share.id} share={share} />
                      ))
                    : null}
                </li>
              );
            })}
          </ul>
          <HistoryPagination
            canPrev={sharedPage.canPrev}
            canNext={sharedPage.canNext}
            onPrev={() => setPage(sharedPage.page - 1)}
            onNext={() => setPage(sharedPage.page + 1)}
          />
        </div>
      )}
    </section>
  );
}

function SharedThreadShareRow({ share }: { share: SharedMockThread["shares"][number] }) {
  const [selected, setSelected] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-background/40 py-2.5 pr-4 pl-12",
        selected && "bg-muted/80",
      )}
    >
      <SettingsCheckbox
        checked={selected}
        ariaLabel={`${SHARED_THREADS_PAGE.selectShare} ${share.url}`}
        onCheckedChange={setSelected}
      />
      <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground underline underline-offset-4">
        {share.url}
      </p>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <GitBranchIcon className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{SHARED_THREADS_PAGE.branchesLabel}</span>
        {share.branchCount}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <EyeIcon className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{SHARED_THREADS_PAGE.viewsLabel}</span>
        {share.viewCount}
      </span>
      <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">
        {share.updatedLabel}
      </span>
      <button
        type="button"
        aria-label={SHARED_THREADS_PAGE.editShare}
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <PencilIcon className="size-3.5" />
      </button>
    </div>
  );
}

function SharedThreadsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border px-6 py-16 text-center">
      <SquareStackIcon className="size-10 text-muted-foreground" aria-hidden="true" />
      <p className="mt-5 text-lg font-semibold text-foreground">{SHARED_THREADS_PAGE.emptyTitle}</p>
      <p className="mt-2 text-sm text-muted-foreground">{SHARED_THREADS_PAGE.emptyDescription}</p>
      <Button render={<Link to="/" />} className="mt-6 rounded-md">
        {SHARED_THREADS_PAGE.createThread}
      </Button>
    </div>
  );
}
