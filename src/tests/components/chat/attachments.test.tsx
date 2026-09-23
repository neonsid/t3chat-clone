// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"

import { AttachmentFileChip } from "@/components/chat/attachments/AttachmentFileChip"
import { AttachmentShell } from "@/components/chat/attachments/AttachmentShell"
import { AttachmentThumbnail } from "@/components/chat/attachments/AttachmentThumbnail"
import { ReasoningBlock } from "@/components/chat/thread/ReasoningBlock"
import { WebSearchBlock } from "@/components/chat/thread/WebSearchBlock"
import { installJsdomMatchMedia } from "@/tests/jsdom-browser"

installJsdomMatchMedia()

afterEach(() => {
  cleanup()
})

test("a ready file chip shows the filename and badge", () => {
  const { getByText, getByLabelText } = render(
    <AttachmentFileChip filename="brief.pdf" badge="PDF" onRemove={() => {}} />
  )

  expect(getByText("brief.pdf")).toBeTruthy()
  expect(getByText("PDF")).toBeTruthy()
  expect(getByLabelText("Remove Attachment")).toBeTruthy()
})

test("an uploading file chip shows percent and cancel", () => {
  const { getByText, getByLabelText } = render(
    <AttachmentFileChip
      filename="brief.pdf"
      badge="PDF"
      uploading
      progress={0.4}
      onRemove={() => {}}
    />
  )

  expect(getByText("40%")).toBeTruthy()
  expect(getByLabelText("Cancel upload")).toBeTruthy()
})

test("a failed file chip keeps the status tooltip copy", () => {
  const { getByText } = render(
    <AttachmentFileChip
      filename="brief.pdf"
      badge="PDF"
      failed
      statusLabel="Too large"
    />
  )

  expect(getByText("brief.pdf")).toBeTruthy()
})

test("an image thumbnail opens when ready and cancels while uploading", () => {
  const { getByLabelText, rerender } = render(
    <AttachmentThumbnail
      filename="shot.png"
      kind="image"
      src="blob:preview"
      onOpen={() => {}}
      onRemove={() => {}}
    />
  )

  expect(getByLabelText("View shot.png")).toBeTruthy()
  expect(getByLabelText("Remove Attachment")).toBeTruthy()

  rerender(
    <AttachmentThumbnail
      filename="shot.png"
      kind="image"
      src="blob:preview"
      showPercent
      progress={0.2}
      onRemove={() => {}}
    />
  )

  expect(getByLabelText("Cancel upload")).toBeTruthy()
})

test("AttachmentShell marks failed and warning frames", () => {
  const { getByText, rerender } = render(
    <AttachmentShell failed>
      <span>chip</span>
    </AttachmentShell>
  )
  expect(getByText("chip").parentElement?.className).toContain(
    "border-destructive/40"
  )

  rerender(
    <AttachmentShell warning>
      <span>chip</span>
    </AttachmentShell>
  )
  expect(getByText("chip").parentElement?.className).toContain(
    "border-amber-500/50"
  )
})

test("ReasoningBlock follows streaming until the user collapses it", async () => {
  const { getByRole, rerender } = render(
    <ReasoningBlock content="thinking" isStreamingThinking />
  )
  const toggle = getByRole("button")
  expect(toggle.getAttribute("aria-expanded")).toBe("true")

  fireEvent.click(toggle)
  expect(toggle.getAttribute("aria-expanded")).toBe("false")

  rerender(<ReasoningBlock content="thinking" isStreamingThinking={false} />)
  expect(toggle.getAttribute("aria-expanded")).toBe("false")
})

test("WebSearchBlock stays expanded after search finishes unless the user collapses it", async () => {
  const { getByRole, rerender } = render(
    <WebSearchBlock sources={[]} queries={["t3 chat"]} isSearching />
  )
  const toggle = getByRole("button")
  expect(toggle.getAttribute("aria-expanded")).toBe("true")

  rerender(
    <WebSearchBlock
      sources={[{ title: "Docs", url: "https://example.com" }]}
      queries={["t3 chat"]}
      isSearching={false}
    />
  )
  expect(toggle.getAttribute("aria-expanded")).toBe("true")
  await waitFor(() => {
    expect(getByRole("link", { name: /Docs/ }).getAttribute("href")).toBe(
      "https://example.com"
    )
  })
})
