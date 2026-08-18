# Phase 4 — Models settings

## Status

| Layer | State |
| --- | --- |
| UI | **Done.** `/settings/models` lists the generated catalog in list and grid views, with search, capability/access filters, recommended/unselect, favorites, and a “new” banner. |
| Persistence | None. Enabled models and favorites on this page are local React state. Reload resets them. |
| App behavior | **None.** The chat model picker still uses `CHAT_MODEL_CATALOG` and stored favorites. Toggling models here does not hide or show picker rows. |

UI files:

- `src/routes/settings/models.tsx`
- `src/components/settings/ModelsSettings.tsx`
- `src/components/settings/ModelsList.tsx`
- `src/components/settings/ModelsGrid.tsx`
- `src/components/settings/ModelsFilterMenu.tsx`
- copy + recommended ids in `src/components/settings/constants.ts`
- filter helpers in `src/components/settings/logic.ts`

Catalog source: `packages/model-catalog/src/generated/catalog.generated.ts` via `@t3chat/model-catalog` (`MODEL_CATALOG`).

Do not persist enabled models, gate by plan, or filter the chat picker until this plan is being executed.

---

## UI inventory (what exists on the page)

| Control | UI now | Later |
| --- | --- | --- |
| Page title + copy | Static | Unchanged |
| `⋯` Select recommended | Sets local selection to `MODELS_RECOMMENDED_IDS` | Same ids from a server/default set that matches the user’s plan |
| `⋯` Unselect all | Clears local selection | Persist empty enabled list (picker would then need a fallback model) |
| New-models banner | Top `N` catalog rows by `lastUpdated` | Dismiss per user; “new” flag from catalog or a cutoff, not a sort of the whole table |
| Search | Client filter on name, id, provider, description | Unchanged |
| Filter → capabilities | Local AND of catalog capabilities | Unchanged |
| Filter → Free / Premium | `inputCostPerMillion === 0` vs `> 0` | Align with real plan SKUs (free pool vs Pro/BYOK) |
| List / Grid | Local view toggle | Optional persist |
| List row click | Toggles enabled (local) | Write `enabledModelIds` and feed the picker |
| List `⋯` Favorite | Local star only | Same `favoriteModelIds` as the chat picker (`preferences`) |
| Grid card | Gold border when enabled; star; NEW pill; price meter; capability icons | Same persistence as list |
| Price meter | Reuses picker `ModelPriceMeter` | Unchanged |
| Provider logos | Reuses `ProviderLogo` / `MODEL_PROVIDER_LOGOS` | Unchanged |

---

## Remaining work — backend

The Models **UI is built**. Enabling a model must later change which ids the chat picker shows. Favorites on this page should become the same list as the picker stars.

Reuse `preferences` (`convex/schema.ts`: `selectedModelId`, `favoriteModelIds`, `combineResults`). Add an **enabled** list; do not copy the catalog into Convex.

### Enabled models

- Widen `preferences` with `enabledModelIds: v.optional(v.array(v.string()))`.
- Empty / missing means “use recommended defaults” (`MODELS_RECOMMENDED_IDS` or a plan-aware subset), not “no models”.
- Validate ids against `MODEL_CATALOG` (or `CHAT_MODEL_CATALOG` if we only allow executable models). Drop unknown ids on read.
- `updateEnabledModels` authed mutation: replace the list. Cap length to catalog size.
- Chat picker: `filterModels` should also require `enabledModelIds` (unless the id is the currently selected model, so a hidden model already in a thread still works).
- Selected model: if the user disables the current model, keep it selected until they pick another, or snap to the first enabled recommended id. Pick one and document it in this file.

### Favorites

- Models tab stars should call the existing favorite toggle (`useModelPreferences` / `preferences.favoriteModelIds`), not a second local array.
- Cap remains `MAX_FAVORITE_MODELS`.

### New banner

- Optional `dismissedNewModelIds` on preferences, or a single `newModelsSeenAt` timestamp compared to `lastUpdated`.
- Do **not** use `Date.now()` inside a Convex query. Pass a client cutoff or store a seen watermark.

### Plan gating

Account billing ([01-account.md](./01-account.md)) is the source of truth for free vs Pro. When Polar/Clerk plans exist:

- Free-tier filter should match models the free plan may call, not only `$0` catalog rows.
- Premium-only filter should match plan-locked models.
- “Select recommended” should differ by plan.

Until billing exists, keep the UI’s cost-based Free/Premium filter.

### Catalog vs executable models

This page shows **all** `MODEL_CATALOG` rows. The picker only lists `CHAT_MODEL_CATALOG` (models with a runtime in `src/lib/chat-models.ts`). Decide before wiring:

1. Settings shows the full catalog; enabling a non-executable model is a no-op in chat until a runtime is added, or
2. Settings lists only `CHAT_MODEL_CATALOG` so every enabled row can actually run.

Prefer (2) when connecting the picker, unless product wants a “coming soon” state.

---

## Out of scope

- Adding models to `packages/model-catalog`
- BYOK / API Keys tab (separate settings phase)
- Changing `/api/chat` model allowlists beyond the existing `CHAT_MODEL_CONFIG` check
