# Settings work — phases

Settings UI lives on this branch (from `feat/settings-account-page`). Account, Customization, History & Sync, and Models are UI-only. Nothing on those pages is backed by Convex except the signed-in Clerk profile (name, email, avatar) in the rail.

| Phase | Tab | UI | Backend | Plan |
| --- | --- | --- | --- | --- |
| 1 | Account | Done (static) | Not started | [01-account.md](./01-account.md) |
| 2 | Customization | Done (local state only) | Not started | [02-customization.md](./02-customization.md) |
| 3 | History & Sync | Done (mock rows; import/export inert) | Not started | [03-history.md](./03-history.md) |
| 4 | Models | Done (catalog list/grid; selection inert) | Not started | [04-models.md](./04-models.md) |
| later | API Keys, Attachments, Shortcuts, Contact Us | Placeholder | — | Write a plan when we start that tab |

Shared chrome on every settings route (header, rail, tabs) is already built. Account work still needs live plan/usage. Customization UI is at `/settings/customization`; fonts, code-block colors, toggles, and profiles are not applied to chat yet. History & Sync is at `/settings/history`; it does not list real threads and does not import or export. Shared Threads on that page is UI-only. Models is at `/settings/models`; enabling a model does not change the chat picker.

Do not implement Polar/Clerk checkout, usage metering, customization persistence, history import/export, or model-picker enablement until the matching plan is being executed.

Creating public shares and branching chats in the product is still later — see [03-history.md](./03-history.md) and [README.md](../README.md#later-work).
