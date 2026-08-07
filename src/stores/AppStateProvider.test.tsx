// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, expect, test } from "vitest"

import { Sidebar } from "@/components/shared/ui/sidebar"
import { AppSidebarProvider } from "@/components/sidebar/AppSidebarProvider"
import { AppStateProvider } from "@/stores/AppStateProvider"
import { SIDEBAR_STATE_COOKIE_NAME } from "@/stores/sidebar-ui-constants"

function renderSidebarShell() {
  return renderToStaticMarkup(
    <AppStateProvider>
      <AppSidebarProvider>
        <Sidebar collapsible="offcanvas" variant="inset" />
        <main>Chat</main>
      </AppSidebarProvider>
    </AppStateProvider>
  )
}

beforeEach(() => {
  document.cookie = `${SIDEBAR_STATE_COOKIE_NAME}=; path=/; max-age=0`
})

test("renders the persisted collapsed sidebar on the very first render", () => {
  document.cookie = `${SIDEBAR_STATE_COOKIE_NAME}=closed; path=/`

  const markup = renderSidebarShell()

  expect(markup).toContain('data-state="collapsed"')
  expect(markup).not.toContain("transition-none!")
})

test("renders an expanded sidebar when nothing is persisted", () => {
  const markup = renderSidebarShell()

  expect(markup).toContain('data-state="expanded"')
})
