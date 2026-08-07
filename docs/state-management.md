# State management

Use the smallest state owner that matches the lifetime of the data:

- Convex owns server documents and authenticated preferences.
- TanStack AI owns streaming chat state.
- TanStack Router owns navigation state.
- Zustand owns shared client UI state and browser-persisted preferences.
- React state owns temporary state tied to one mounted widget or DOM element.

The Zustand stores are split by feature under `src/stores`. Components must
subscribe with a narrow selector instead of reading an entire store. Store
actions may coordinate browser persistence, but stores must not contain Convex
clients, mutations, React refs, or DOM elements.

Persistence is intentionally scoped:

- Composer drafts and options use session storage.
- Guest model preferences use local storage.
- The desktop sidebar open state uses a cookie.
- Model-picker filters, sidebar search, pinned-section expansion, and the mobile
  sidebar sheet stay in memory.

`AppStateProvider` creates isolated vanilla stores for each application render
and hydrates browser storage after mount.

State that changes the first painted layout must be readable during the server
render, otherwise the server emits the default and the client corrects it after
hydration, which the user sees as a flicker. That is why the desktop sidebar
state lives in a cookie: `readSidebarDesktopOpen` reads the request cookie on
the server and `document.cookie` on the client, so the server markup and the
hydration render already agree with the persisted state.
