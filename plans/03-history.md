# Phase 3 — History & Sync settings

## Status

| Layer | State |
| --- | --- |
| UI | **Done.** `/settings/history` has Chat History (selection, pins, archive/delete), Shared Threads (expand, nested URLs, delete, pagination, empty state), and a Danger Zone. |
| Persistence | None. Rows are mock constants. Import / Export / Archive / Delete / Edit share do not hit Convex. |
| App behavior | **None.** Sidebar threads, Convex `threads` / `messages`, and R2 attachments are not used. |
| Shared threads / branching | **UI only.** Nested share rows exist; creating shares, public `/share/...` routes, and branching chats are not wired. Backend below. |

UI files:

- `src/routes/settings/history.tsx`
- `src/components/settings/HistorySettings.tsx`
- `src/components/settings/HistoryThreadList.tsx`
- `src/components/settings/SharedThreadsSection.tsx`
- `src/components/settings/SettingsCheckbox.tsx`
- copy + mock rows in `src/components/settings/constants.ts`
- pagination / selection helpers in `src/components/settings/logic.ts`

Do not wire Convex, file download, or import parsing until this plan is being executed.

---

## UI inventory (what exists on the page)

| Control | UI now | Later |
| --- | --- | --- |
| Page title + backup copy | Static | Unchanged |
| `⋯` Import | Closes the menu | File picker → merge import (must not delete existing chats) |
| `⋯` Export selected | Disabled until a checkbox is on | Download JSON for selected thread ids |
| `⋯` Export all | Closes the menu | Download JSON for every owned thread |
| Header checkbox | Selects / clears the current page; minus when mixed | Same, against live ids |
| Row checkbox | Magenta filled check + row highlight | Same |
| Archive (N) / Delete (N) | Appear when any row is selected; remove from local mock list | `archiveThread` / delete mutations |
| Pin icon | Static on mock pinned rows | `threads.isPinned` |
| Title | Truncated mock title + tooltip | Live `threads.title`; click can open `/chat/$threadId` |
| Relative date | Hardcoded labels | `threads.updatedAt` formatted on the client |
| Previous / Next | Paginates mock rows (10 per page) | `paginate()` on `by_ownerId_and_state_and_updatedAt` |
| Loading skeletons | Not shown (mock data is sync) | Show while the first page query is undefined |
| Shared Threads list | Mock parents + chevron | Live `threadShares` grouped by thread |
| Shared Delete (N) | Appears when any shared row is selected; removes from local mock list | Revoke / delete share mutations |
| Shared Previous / Next | Paginates mock rows (10 per page) | Paginate grouped `threadShares` |
| Nested share row | URL, branch count, views, time, edit (inert) | Public link, real counts, edit/revoke dialog |
| Shared empty state | Used when the mock list is empty | Same copy when the user has no shares |
| Danger Zone | Confirm then clears local mock history and shared lists | Delete all owned threads + shares on the server |

---

## Remaining work — backend

Reuse the existing `threads` and `messages` tables. Do **not** copy chat bodies onto a settings-only table.

Export / import should run as an **action** (`"use node"` only if we need Node APIs for zip/blob). Prefer a query that returns a page of `{ id, title, updatedAt }` for the list, and a separate export action so we do not collect unbounded messages in a query.

### List

- `listHistoryThreads` authed query: owner’s `state === "active"` threads, `hasMessages === true`, newest `updatedAt` first, `.paginate()`.
- Skip temporary / guest threads (they are not Convex rows today).
- Page size 10 to match `HISTORY_PAGE_SIZE`.
- Return `{ _id, title, updatedAt }` only. Do not send messages to this page.

Replace `HISTORY_MOCK_THREADS` with `usePaginatedQuery`. Keep the table chrome.

### Export

JSON (versioned) so a later import can round-trip:

```ts
{
  version: 1,
  exportedAt: number,
  threads: Array<{
    title: string
    titleSource: "pending" | "generated" | "derived" | "manual"
    createdAt?: number
    updatedAt: number
    messages: Array<{
      role: "user" | "assistant"
      content: string
      thinking?: string
      createdAt: number
    }>
  }>
}
```

- Selected export: the checked ids, still verified server-side (`ownerId` + `state`).
- Export all: paginate internally in the action until done. Never `.collect()` unbounded `messages`.
- Attachments: **out of scope for v1** unless we already have a stable R2 URL story. Document in the file that images/PDFs are skipped, or add a follow-up to copy R2 objects.
- Download on the client (`Blob` + `URL.createObjectURL`). No Convex file storage for the export itself.

### Import

- Client file input (`application/json`).
- Action validates `version`, caps thread count and message size, then `internalMutation`s insert **new** threads. Never delete or overwrite existing threads (matches the page copy).
- Generate new thread ids. Do not reuse exported ids (they are another deployment’s `Id<"threads">`).
- Account delete (`plans/01-account.md`) is unrelated: import is additive.

### Sync

The tab is named History & Sync. T3’s page is backup (import/export), not live multi-device CRDT sync. Convex already syncs the live thread list. Do **not** add a second sync protocol. If we later add “download my data” / “transfer to another account”, that is this export/import pair.

---

## Remaining work — shared threads backend

The Shared Threads **UI is built**. Creating shares, `/share/$publicId` routes, view counts, and branching chats still need product work.

Keep the layout in `SharedThreadsSection.tsx`. Do not rebuild it. Wire:

```ts
threadShares: defineTable({
  ownerId: v.string(),
  threadId: v.id("threads"),
  publicId: v.string(),
  title: v.string(),
  viewCount: v.number(),
  createdAt: v.number(),
  revokedAt: v.optional(v.number()),
})
  .index("by_ownerId_and_createdAt", ["ownerId", "createdAt"])
  .index("by_threadId", ["threadId"])
  .index("by_publicId", ["publicId"]),
```

Branching likely needs `parentThreadId` on `threads` or a `threadBranches` table. Spec that with the branching feature.

README reminder: [Later work](../README.md#later-work).

---

## Remaining work — frontend wiring

| Control | Touch points |
| --- | --- |
| Live list | `HistorySettings` — drop mock constant; keep checkbox / pagination helpers |
| Skeletons | Reuse `Skeleton` in each row while `usePaginatedQuery` is loading (screenshot 1) |
| Import | Hidden `<input type="file" accept="application/json">` from the `⋯` item |
| Export | Build JSON in an action or from a query+client zip; trigger download |
| Open chat | Title `Link` to `/chat/$threadId` |
| Dates | Format `updatedAt` with `Intl.RelativeTimeFormat` on the client (pass the timestamp in, do not call `Date.now()` inside a Convex query) |

Keep `getHistoryPage` / `pageSelection` / `setPageSelected` / `toggleIdInList` — they stay valid with live ids.

---

## Implementation order (when we leave UI-only)

1. Paginated `listHistoryThreads` + loading skeletons.
2. Export selected / export all as versioned JSON.
3. Import merge (new threads only) + tests for “does not delete existing”.
4. Wire Archive / Delete / pin on this page to existing thread mutations.
5. Shared threads: public routes + `threadShares` behind the existing UI.

## Out of scope

- Live multi-device sync beyond Convex.
- Exporting R2 attachments (follow-up).
- Polar / usage (Phase 1).
- Customization persistence (Phase 2).
- Implementing share creation and branching in the chat product (settings UI is already there).
