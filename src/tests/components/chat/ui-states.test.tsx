// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { useLayoutEffect } from "react"
import { afterEach, expect, test, vi } from "vitest"
import type { UIMessage } from "@tanstack/ai-react"

vi.hoisted(() => {
  const values = new Map<string, string>()
  const storage = {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return [...values.keys()][index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
  vi.stubGlobal("localStorage", storage)
})

import { ComposerSendButton } from "@/components/chat/composer/ComposerToolbar"
import { ChatMessage } from "@/components/chat/thread/ChatMessage"
import {
  SidebarEmptyState,
  ThreadRowButton,
} from "@/components/sidebar/AppSidebar"
import { AppSidebarProvider } from "@/components/sidebar/AppSidebarProvider"
import { AppStateProvider, useChatUiStore } from "@/stores/AppStateProvider"
import { installJsdomMatchMedia } from "@/tests/jsdom-browser"

installJsdomMatchMedia()

afterEach(() => {
  cleanup()
})

test("sidebar shows an empty state, then a thread title", () => {
  const { getByText, rerender } = render(
    <SidebarEmptyState searching={false} />
  )
  expect(getByText("No chats yet")).toBeTruthy()

  rerender(
    <AppStateProvider>
      <AppSidebarProvider>
        <ThreadRowButton
          isRenaming={false}
          isTemporary={false}
          isBranched={false}
          isActive
          isBusy={false}
          isTitlePending={false}
          displayTitle="Routing notes"
          renameDraft=""
          onRenameDraftChange={() => {}}
          onCommitRename={() => {}}
          onCancelRename={() => {}}
          onSelect={() => {}}
        />
      </AppSidebarProvider>
    </AppStateProvider>
  )

  expect(getByText("Routing notes")).toBeTruthy()
})

function SendHarness({
  draft,
  isLoading,
}: {
  draft: string
  isLoading: boolean
}) {
  const setDraft = useChatUiStore((state) => state.setDraft)
  useLayoutEffect(() => {
    setDraft("guest", draft)
  }, [draft, setDraft])
  return (
    <ComposerSendButton
      threadStateKey="guest"
      isLoading={isLoading}
      disabled={false}
      onStop={() => {}}
    />
  )
}

test("composer send is disabled until there is a draft, then becomes stop while loading", async () => {
  const { getByRole, rerender } = render(
    <AppStateProvider>
      <SendHarness draft="" isLoading={false} />
    </AppStateProvider>
  )

  expect(
    getByRole("button", { name: "Send message" }).hasAttribute("disabled")
  ).toBe(true)

  rerender(
    <AppStateProvider>
      <SendHarness draft="hello" isLoading={false} />
    </AppStateProvider>
  )
  await waitFor(() => {
    expect(
      getByRole("button", { name: "Send message" }).hasAttribute("disabled")
    ).toBe(false)
  })

  rerender(
    <AppStateProvider>
      <SendHarness draft="hello" isLoading />
    </AppStateProvider>
  )
  expect(getByRole("button", { name: "Stop generating" })).toBeTruthy()
})

const convex = new ConvexReactClient("https://test.convex.cloud")

function chatMessage(
  id: string,
  role: UIMessage["role"],
  content: string
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", content }],
    createdAt: new Date(0),
  }
}

test("user messages sit in a bubble, assistant messages stay flush left", () => {
  const { getByText, rerender, queryByLabelText } = render(
    <ConvexProvider client={convex}>
      <ChatMessage
        message={chatMessage("u1", "user", "Ship the sidebar empty state")}
        readOnly
        isTemporary
      />
    </ConvexProvider>
  )

  expect(getByText("Ship the sidebar empty state")).toBeTruthy()
  expect(queryByLabelText("Response generation statistics")).toBeNull()

  rerender(
    <ConvexProvider client={convex}>
      <ChatMessage
        message={chatMessage("a1", "assistant", "Empty state copy is ready.")}
        readOnly
        isTemporary
        generationStats={{
          modelName: "GPT",
          mode: "chat",
          outputTokens: 12,
          tokensPerSecond: 40,
          timeToFirstTokenSeconds: 0.2,
        }}
      />
    </ConvexProvider>
  )

  expect(getByText("Empty state copy is ready.")).toBeTruthy()
  expect(getByText("GPT (chat)")).toBeTruthy()
})
