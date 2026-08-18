import { useState } from "react";
import { ArchiveIcon, ChevronLeftIcon, ChevronRightIcon, PinIcon, Trash2Icon } from "lucide-react";

import {
  HISTORY_PAGE,
  HISTORY_PAGE_SIZE,
  type HistoryMockThread,
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

export function HistoryThreadList({
  threads,
  selectedIds,
  onSelectedIdsChange,
  onArchive,
  onDelete,
}: {
  threads: ReadonlyArray<HistoryMockThread>;
  selectedIds: ReadonlyArray<string>;
  onSelectedIdsChange: (ids: Array<string>) => void;
  onArchive: (ids: ReadonlyArray<string>) => void;
  onDelete: (ids: ReadonlyArray<string>) => void;
}) {
  const [page, setPage] = useState(0);
  const historyPage = getHistoryPage(threads, page, HISTORY_PAGE_SIZE);
  const pageIds = historyPage.items.map((thread) => thread.id);
  const selection = pageSelection(pageIds, selectedIds);
  const selectedCount = selectedIds.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <SettingsCheckbox
          checked={selection === "all"}
          indeterminate={selection === "some"}
          ariaLabel={HISTORY_PAGE.selectPage}
          onCheckedChange={(checked) =>
            onSelectedIdsChange(setPageSelected(pageIds, selectedIds, checked))
          }
        />
        <p className="text-sm font-medium text-foreground">{HISTORY_PAGE.titleColumn}</p>
        {selectedCount > 0 ? (
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md border-primary/70"
              onClick={() => onArchive(selectedIds)}
            >
              <ArchiveIcon />
              {historyActionLabel(HISTORY_PAGE.archive, selectedCount)}
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-md"
              onClick={() => onDelete(selectedIds)}
            >
              <Trash2Icon />
              {historyActionLabel(HISTORY_PAGE.delete, selectedCount)}
            </Button>
          </div>
        ) : null}
      </div>

      <ul>
        {historyPage.items.map((thread) => {
          const selected = selectedIds.includes(thread.id);
          return (
            <li
              key={thread.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-accent/50",
                selected && "bg-muted/80",
              )}
            >
              <SettingsCheckbox
                checked={selected}
                ariaLabel={`${HISTORY_PAGE.selectThread} ${thread.title}`}
                onCheckedChange={() => onSelectedIdsChange(toggleIdInList(selectedIds, thread.id))}
              />
              <Tooltip content={thread.title} side="top" wrapperClassName="min-w-0 flex-1">
                <p className="w-full min-w-0 truncate text-sm text-foreground">{thread.title}</p>
              </Tooltip>
              {thread.pinned ? (
                <PinIcon
                  className="size-3.5 shrink-0 fill-primary text-primary"
                  aria-label={HISTORY_PAGE.pinnedLabel}
                />
              ) : null}
              <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                {thread.updatedLabel}
              </span>
            </li>
          );
        })}
      </ul>

      <HistoryPagination
        canPrev={historyPage.canPrev}
        canNext={historyPage.canNext}
        onPrev={() => setPage(historyPage.page - 1)}
        onNext={() => setPage(historyPage.page + 1)}
      />
    </section>
  );
}

export function HistoryPagination({
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
      <span className={cn("inline-flex", !canPrev && "cursor-not-allowed")}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md"
          disabled={!canPrev}
          onClick={onPrev}
        >
          <ChevronLeftIcon />
          {HISTORY_PAGE.previous}
        </Button>
      </span>
      <span className={cn("inline-flex", !canNext && "cursor-not-allowed")}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md"
          disabled={!canNext}
          onClick={onNext}
        >
          {HISTORY_PAGE.next}
          <ChevronRightIcon />
        </Button>
      </span>
    </div>
  );
}
