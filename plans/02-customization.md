# Phase 2 — Customization settings

## Status

| Layer | State |
| --- | --- |
| UI | **Done.** `/settings/customization` renders the page from the screenshots. |
| Persistence | None. Form fields, toggles, and dropdowns are local React state. Reload loses them. |
| App behavior | **None.** Chat, composer, theme, fonts, markdown, and chrome ignore this page. |
| Fonts / code colors | Dropdowns and a **static** preview only. Selecting a font does not load a typeface, change CSS variables, or restyle the preview. The preview code block is hand-colored spans, not Streamdown/Shiki. |

UI files:

- `src/routes/settings/customization.tsx`
- `src/components/settings/CustomizationSettings.tsx`
- `src/components/settings/CustomizationProfile.tsx`
- `src/components/settings/CustomizationOptions.tsx`
- `src/components/settings/CustomizationFonts.tsx`
- `src/components/settings/SettingsSelect.tsx`
- `src/components/settings/SettingsToggleRow.tsx`
- copy in `src/components/settings/constants.ts`

Do not wire Convex or global CSS until this plan is being executed. Polar / usage stays in [01-account.md](./01-account.md).

---

## UI inventory (what exists on the page)

### Profile

| Control | UI now | Later |
| --- | --- | --- |
| Profile dropdown ("Default") | One fake option; `onValueChange` is a no-op | List real profiles; switching loads fields |
| `+` add profile | Button with no handler | `createProfile` mutation; prompt for name |
| Preferred name (50) | Local input + counter | Persist on active profile |
| Occupation (100) | Local input + counter | Persist |
| Traits (100) + chips | Local tags, Enter/Tab/chip add, remove | Persist `traits[]`; enforce budget server-side |
| Extra (3000) | Local textarea | Persist; inject into system prompt |

### Behavior

| Toggle | Default on the page | Later |
| --- | --- | --- |
| Disable External Link Warning | on | Skip confirm on markdown links |
| Invert Send/New Line Behavior | off | Composer `handleKeyDown` |

### Visual

| Toggle | Default on the page | Later |
| --- | --- | --- |
| Boring Theme | off | T3 pink → muted palette |
| Hide Personal Information | off | Rail + sidebar hide name/email |
| Disable Thematic Breaks | on | Hide Streamdown `hr` |
| Stats for Nerds | on | Gate existing generation stats row |
| Minimalist command menu | off | Inert until a command palette exists |

### Fonts (display only)

| Control | Options shown | Later |
| --- | --- | --- |
| Main Text Font | Geist (default), Inter, System Sans | Apply `--app-font-sans` |
| Code Font | Geist Mono, System Monospace Font | Apply `--app-font-mono` |
| Chat Density | Compact, Standard (default), Comfortable | Apply message gap / leading |
| Fonts Preview | Static mock (user bubble, prose, fake TS block) | Live preview using the same renderer as chat |

Geist is labeled default because Proxima Vara is proprietary. Inter is already imported in `src/styles.css` but unused.

---

## Remaining work — backend

Do **not** dump flags onto the existing `preferences` table (that row is model-picker state and updates often). Split:

1. `customizationProfiles` — one row per persona.
2. `uiPreferences` — one row per owner for toggles/fonts.

```ts
customizationProfiles: defineTable({
  ownerId: v.string(),
  name: v.string(),
  isActive: v.boolean(),
  preferredName: v.string(),
  occupation: v.string(),
  traits: v.array(v.string()),
  extra: v.string(),
  updatedAt: v.number(),
})
  .index("by_ownerId_and_isActive", ["ownerId", "isActive"])
  .index("by_ownerId_and_updatedAt", ["ownerId", "updatedAt"]),

uiPreferences: defineTable({
  ownerId: v.string(),
  disableExternalLinkWarning: v.boolean(),
  invertSendEnter: v.boolean(),
  boringTheme: v.boolean(),
  hidePersonalInformation: v.boolean(),
  disableThematicBreaks: v.boolean(),
  statsForNerds: v.boolean(),
  minimalistCommandMenu: v.boolean(),
  mainFontId: v.string(),
  codeFontId: v.string(),
  chatDensityId: v.union(
    v.literal("compact"),
    v.literal("standard"),
    v.literal("comfortable"),
  ),
})
  .index("by_ownerId", ["ownerId"]),
```

Validators (mirror the UI constants):

- `preferredName` ≤ 50, `occupation` ≤ 100, joined traits ≤ 100, each trait ≤ 30, `extra` ≤ 3000, profile `name` ≤ 40.
- `traits` array cap ~20.
- `mainFontId` / `codeFontId` must be in a server allowlist identical to `CUSTOMIZATION_MAIN_FONTS` / `CUSTOMIZATION_CODE_FONTS`.
- At most one `isActive: true` per owner (enforce in the mutation).
- Hard cap 10 profiles per owner. `listProfiles` uses `.take(20)`.

Defaults when no row exists:

```ts
{
  disableExternalLinkWarning: false, // safer than the screenshot default
  invertSendEnter: false,
  boringTheme: false,
  hidePersonalInformation: false,
  disableThematicBreaks: false,
  statsForNerds: true,
  minimalistCommandMenu: false,
  mainFontId: "geist",
  codeFontId: "geist-mono",
  chatDensityId: "standard",
}
```

Lazy-insert an active profile named `"Default"` with empty fields on first `listProfiles`.

### Convex functions (`convex/customization.ts`)

Queries/mutations only (no `"use node"`). Use `authedQuery` / `authedMutation`. Never take `userId` from the client.

- `listProfiles` / `getActiveProfile`
- `createProfile` / `renameProfile` / `deleteProfile` (block deleting the last one) / `setActiveProfile`
- `updateActiveProfile({ preferredName, occupation, traits, extra })` — client debounce ~400ms
- `getUiPreferences` / `updateUiPreferences` — patch only provided fields (`v.optional` each)

Account delete (`plans/01-account.md`) must also wipe these two tables.

### Inject persona into chat

`/api/chat` currently sends thread messages only (`contextToModelMessages`).

- Load `getActiveProfile` on the server (from `chatRuns.start` return or a query in the route). Do not trust a client-supplied bio.
- Build a system message from preferred name, occupation, traits, extra in `src/lib/chat-persona.ts`.
- Skip the system message when every field is empty.
- Unit-test empty profile → no system message; length limits.

---

## Remaining work — fonts (major frontend)

Today `--app-font-sans` is `"Geist Variable"` and `--app-font-mono` is `"Geist Mono Variable"` (`src/styles.css`). Inter is imported and unused. The customization dropdowns do not touch these variables.

When wiring:

1. `src/lib/fonts.ts` — catalogs, CSS `font-family` strings, `isMainFontId` / `isCodeFontId`. Reuse the ids already in `CUSTOMIZATION_*_FONTS`.
2. Apply on `document.documentElement`: `--app-font-sans`, `--app-font-mono`. Same pattern as `applyTheme` in `src/lib/theme.ts`.
3. Boot script (extend `themeBootScript` or a sibling) so the first paint uses a localStorage cache of uiPreferences and does not flash Geist then Inter.
4. Signed-in: Convex is source of truth; mirror to localStorage. Settings is signed-in only.
5. Live preview: the static `FontsPreview` mock must switch to the same markdown + code renderer as chat (see code-block section). Until then, at minimum set CSS variables on the preview root so sans/mono/density update locally even before chat is wired.

Density CSS variables (apply on the thread scroller, not per message):

| id | Intent |
| --- | --- |
| `compact` | tighter than current `text-[15px] leading-7` |
| `standard` | current ChatMessage / StreamdownMarkdown |
| `comfortable` | extra gap between messages + looser leading |

Do not add `@fontsource` packages until a font is actually in the catalog. Do not bundle Proxima Vara.

---

## Remaining work — code block colors (major frontend)

This is separate from **code font**. Font is `--font-mono`. Color is syntax highlighting + chrome (header, background, token colors).

### What the app does today

- Streamdown code plugin is created once:

```ts
// src/components/chat/thread/constants.ts
export const STREAMDOWN_PLUGINS = {
  code: createCodePlugin({ themes: ["github-light", "min-dark"] }),
}
```

- Layout/chrome is CSS in `src/styles.css` under `.chat-surface [data-streamdown="code-block"]` (border, header bar, copy button, body padding).
- T3 Chat theme only overrides **background/foreground** of the block:

```css
html[data-theme-id="t3-chat"] .chat-surface [data-streamdown="code-block"] { ... }
```

  Token colors still come from Shiki `github-light` / `min-dark`, not from T3 pink/salmon.
- Inline code is not on a separate theme.
- The Fonts Preview block is a fake `<pre>` with `text-primary` on `const`. It does not use Streamdown, Shiki, or the chat code-block CSS. Changing Linear vs T3 Chat in the header will tint `text-primary`, but that is not a real highlighter.

### What to build later

**1. One renderer for chat and preview**

Replace `FontsPreview`'s hand-rolled tokens with `StreamdownMarkdown` (or a thin wrapper) feeding a fixed typescript sample. Preview and chat must share:

- `createCodePlugin` theme pair
- `.chat-surface` code-block CSS
- `--font-mono` (so Code Font dropdown actually changes the preview)

If Streamdown is too heavy for the settings page, extract a `ChatCodeBlock` that both call. Do not keep two visual languages.

**2. Theme pairs, not a single Shiki id**

Light and dark need different highlighters. Keep a catalog:

| App color theme | Light Shiki | Dark Shiki | Notes |
| --- | --- | --- | --- |
| Linear (`default`) | `github-light` | `min-dark` | current |
| T3 Chat | pink-friendly light (e.g. `catppuccin-latte` or a custom CSS token overlay) | pink-friendly dark (tokens using `--primary` / rose) | must match T3 screenshot: salmon/pink keywords on dark |
| T3 + boring | desaturated pair | desaturated pair | boring theme mutes pink; code should not stay hot-pink |

`createCodePlugin({ themes: [light, dark] })` is created at module scope today. If the pair depends on `data-theme-id` / `data-boring`, either:

- Recreate the plugin when theme changes (settings + chat remount markdown), or
- Keep one Shiki pair and **recolor tokens with CSS** on top of Shiki classes (more stable, no remount). Prefer CSS overlay if Shiki class names are stable (`--shiki-token-keyword`, etc.). Verify the class/CSS variable names `@streamdown/code` emits before choosing.

**3. CSS token overlay (recommended if Shiki vars exist)**

Define on `:root` / `.dark` / `html[data-theme-id="t3-chat"]`:

- `--code-background`, `--code-foreground` (already partially used for T3)
- `--code-token-keyword`, `--code-token-string`, `--code-token-function`, `--code-token-comment`, `--code-token-number`

Map those onto Streamdown/Shiki spans. T3 Chat screenshot: keyword ≈ primary pink (`#f472b6` / `--primary`), strings slightly lighter, comments muted.

Boring theme: point `--code-token-*` at gray/indigo so code does not keep the loud pink.

**4. Inline code vs fenced blocks**

Fenced blocks use the plugin + chrome. Inline `` `code` `` uses `--font-mono` only today. When Code Font changes, inline must change too (`code` / `[data-streamdown="inline-code"]`). Inline should **not** pick up the full block background.

**5. Do not add a fourth settings dropdown for "code theme"**

T3's screenshot has Main Font / Code Font / Density only. Code **colors** follow the app theme (Linear vs T3 Chat vs boring + light/dark). Do not persist a `codeThemeId` unless we later add that control.

**6. Streaming**

`StreamdownMarkdown` uses `mode={isStreaming ? "streaming" : "static"}`. Theme/font changes must not reset a live stream. Applying CSS variables on `documentElement` is safe; swapping the plugin instance mid-stream is not. Another reason to prefer CSS overlays.

**7. Tests**

- Font id guards.
- Preview and chat use the same plugin export (import equality).
- CSS variable application for mono (jsdom `documentElement.style`).

---

## Remaining work — other frontend wiring

Hydrate `uiPreferences` + active profile into Zustand (new store or extend `preferences-store`) so composer, markdown, and chrome do not each `useQuery`. Pattern: `useModelPreferences`.

| Flag | Touch points |
| --- | --- |
| Invert send | `ComposerDraftField.handleKeyDown`. Default: Enter send, Shift+Enter newline. Inverted: Enter newline, Mod+Enter send. Ignore when `event.nativeEvent.isComposing`. |
| External link warning | No warning exists. Custom Streamdown `a` (or click capture): external `http(s)` → modal unless disabled; `rel=noopener noreferrer`; internal paths skip. |
| Thematic breaks | Custom Streamdown `hr` → `null` when disabled. |
| Stats for Nerds | Wrap the tok/sec / TTFT / token row in `ChatMessage.tsx`. Copy + timestamp stay. `messages.generation` already stored — no backend. |
| Hide PII | `SettingsRail` + `SidebarAccount` show generic "Account", hide email. Do not change Clerk. |
| Boring Theme | `html[data-theme-id="t3-chat"][data-boring="true"]` in `styles.css`. No-op on Linear. Header moon toggle stays light/dark. |
| Minimalist command menu | Persist only. No `mod+K` palette yet. |

Replace local `useState` in `CustomizationProfile` / `CustomizationOptions` / `CustomizationFonts` with Convex queries/mutations. Keep the visual components; do not rebuild the page.

`+` profile and dropdown become real CRUD. Debounce field saves.

---

## Implementation order (when we leave UI-only)

1. Schema + `getUiPreferences` / `updateUiPreferences` + wire toggles and font ids (still no CSS apply).
2. Apply fonts/density CSS + boot script; make Fonts Preview respect variables.
3. Replace preview fake code with Streamdown; add T3/boring token CSS overlays.
4. Composer invert, link warning, `hr`, stats, hide PII, boring theme.
5. Profiles CRUD + system prompt in `/api/chat`.
6. Command-menu flag stays stored but inert until Shortcuts.

## Out of scope

- Per-thread persona override.
- Uploading custom font files.
- A separate "code theme" dropdown.
- Polar / usage (Phase 1).
- Building the command palette.
