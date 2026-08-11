# React Doctor triage

Snapshot from `npx react-doctor@latest --verbose` (score 45/100, 46 findings).
Treat diagnostics as hypotheses. Re-triage **new** findings only; do not “fix”
the leave buckets below by effect-syncing refs.

## Rules of thumb

1. **Do not** move latest-ref / sticky-latch `ref.current = …` writes into
   `useEffect` / `useLayoutEffect` to silence the linter. That reintroduces
   stale submit/stop/flush/scroll handlers and can blank the draft→thread
   handoff.
2. **`useEffectEvent`** is for logic called from Effects (and effect-scheduled
   timers). Do **not** pass an Effect Event into child props or context; wrap
   with a stable callback, or keep a latest-ref if the value is handed to
   children/context.
3. React Compiler is **not** enabled. Enabling it later requires migrating
   remaining render-time ref access first; see the plan notes in the PR that
   introduced this doc.

## Leave / false positive

| Finding | Why leave |
|---------|-----------|
| `deslop/unused-file` ×13 (Convex modules, `_generated/server.js`, `src/start.ts`, …) | Convex `api`/`internal` entrypoints and framework convention files are not import-graph dead code |
| `no-static-element-interactions` on `ModelPickerRow` | Overlay `<button>` for keyboard/focus + nested favorite button; row `div` `onClick` is required for mouse hit-testing |
| Chained `.filter().map()` / `.map().filter(Boolean)` | Tiny arrays; style-only |
| `require-pnpm-hardening` | Product tradeoff (`minimumReleaseAge`, `trustPolicy`); not a cleanup default |
| `no-giant-component` on `ChatThreadView` / `AppSidebar` | Defer until feature work; ChatThreadView needs a streaming history-identity test first |

## Intentional `ref` during render

### Write-only latest-ref (safe; call only outside render)

| Site | Intent |
|------|--------|
| `ChatShellComposer` submit ref | Stable callback, latest draft/auth/busy |
| `ChatComposer` `onSubmit` ref | Stable submit passed to draft field |
| `ChatThreadView` submit / stop / flush refs | Runtime store binds once per thread |
| `sidebar` open/setter refs | Stable context actions without open-toggle fan-out |

### Write + read during render (sticky / freeze)

Concurrent caveat: a discarded render can leave a latch/cache write behind. For
these inputs that is preferred over blanking UI or remounting history every
chunk.

| Site | Intent |
|------|--------|
| `ChatThreadPanel` ready / pending latches | Keep optimistic panel across transient unreadiness |
| `ChatThreadView` history freeze via `resolveFrozenStreamingHistory` | Keep history row identity stable while the trailing assistant streams |

Minimap caching uses `useMemo` keyed by `minimapRevision` (not a ref).

`MessageScrollerEnsureEnd` uses `useEffectEvent` for delayed `scrollToEnd`
calls scheduled from a layout effect.

## Safe cleanups already applied

- Removed unused `SIDEBAR_THREAD_PAGE_SIZE`, `SIDEBAR_LOAD_MORE_DELAY_MS`,
  `useThreadSubmissionState`, `useThreadComposerControls`.
