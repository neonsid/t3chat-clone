# Settings work — phases

Settings UI lives on this branch (from `feat/settings-account-page`). Account and Customization are UI-only. Nothing on those pages is backed by Convex except the signed-in Clerk profile (name, email, avatar) in the rail.

| Phase | Tab | UI | Backend | Plan |
| --- | --- | --- | --- | --- |
| 1 | Account | Done (static) | Not started | [01-account.md](./01-account.md) |
| 2 | Customization | Done (local state only) | Not started | [02-customization.md](./02-customization.md) |
| later | History & Sync, Models, API Keys, Attachments, Shortcuts, Contact Us | Placeholder | — | Write a plan when we start that tab |

Shared chrome on every settings route (header, rail, tabs) is already built. Account work still needs live plan/usage. Customization UI is at `/settings/customization`; fonts, code-block colors, toggles, and profiles are not applied to chat yet.

Do not implement Polar/Clerk checkout, usage metering, or customization persistence until the matching plan is being executed.
