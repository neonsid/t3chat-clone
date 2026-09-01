// @vitest-environment jsdom

import { fireEvent, render, waitFor } from "@testing-library/react"
import { expect, test } from "vitest"

import { StreamdownMarkdown } from "@/components/chat/thread/StreamdownMarkdown"

window.matchMedia = ((query: string) => ({
  matches: query.includes("hover"),
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {
    return false
  },
})) as typeof window.matchMedia

const SAMPLE = `To make a browser like **Helium** the default browser on Arch Linux, set the \`x-scheme-handler\` MIME associations via \`xdg-settings\` or \`xdg-mime\`.

### 1. Confirm the browser’s \`.desktop\` file

List likely desktop entries:

\`\`\`bash
ls /usr/share/applications | grep -i helium
\`\`\`

or, if installed per-user:

\`\`\`bash
ls ~/.local/share/applications | grep -i helium
\`\`\`

Assume it is called \`helium.desktop\`. Use the exact filename you find.

### 2. Set it as the default browser

\`\`\`bash
xdg-settings set default-web-browser helium.desktop
\`\`\`

Example:

\`\`\`ini
[Desktop Entry]
Name=Helium
Comment=Web Browser
Exec=/path/to/helium %U
Terminal=false
Type=Application
Icon=helium
Categories=Network;WebBrowser;
MimeType=text/html;application/xhtml+xml;x-scheme-handler/http;x-scheme-handler/https;
StartupNotify=true
\`\`\`
`

test("static mode renders headings and fenced code", () => {
  const { container } = render(
    <StreamdownMarkdown text={SAMPLE} isStreaming={false} />
  )
  expect(container.querySelector("h3")?.textContent).toContain(
    "Confirm the browser"
  )
  expect(container.querySelector("[data-streamdown='code-block']")).toBeTruthy()
  expect(container.textContent).not.toContain("###")
  expect(container.textContent).not.toContain("```")
})

test("streaming mode still renders headings and fenced code", () => {
  const { container } = render(
    <StreamdownMarkdown text={SAMPLE} isStreaming={true} />
  )
  expect(container.querySelector("h3")?.textContent).toContain(
    "Confirm the browser"
  )
  expect(container.textContent).not.toContain("###")
  expect(container.textContent).not.toContain("```")
})

test("an incomplete fence does not dump the whole answer as raw markdown", () => {
  const text = "### Hello\n\n```ba"
  const { container } = render(
    <StreamdownMarkdown text={text} isStreaming={true} />
  )
  expect(container.querySelector("h3")?.textContent).toContain("Hello")
  expect(container.textContent).not.toContain("###")
})

test("leaving streaming retries markdown after a failed pass", () => {
  const { container, rerender } = render(
    <StreamdownMarkdown text={SAMPLE} isStreaming={true} />
  )
  rerender(<StreamdownMarkdown text={SAMPLE} isStreaming={false} />)
  expect(container.querySelector("h3")?.textContent).toContain(
    "Confirm the browser"
  )
  expect(container.textContent).not.toContain("```")
})

test("code block copy uses the app tooltip instead of a native title", async () => {
  const { container } = render(
    <StreamdownMarkdown text={"```ts\nconst x = 1\n```"} isStreaming={false} />
  )
  const copy = container.querySelector(
    "[data-streamdown='code-block-copy-button']"
  )
  expect(copy).toBeTruthy()
  expect(copy?.getAttribute("title")).toBeNull()
  fireEvent.mouseEnter(copy as HTMLElement)
  await waitFor(() => {
    expect(document.querySelector("[role='tooltip']")?.textContent).toBe(
      "Copy code"
    )
  })
})

const TABLE = `| Promise | Effect |
| --- | --- |
| eager | lazy |
| \`async\` / \`await\` | \`pipe\` / \`flatMap\` |
`

test("markdown tables omit fullscreen and stay in a shrink-wrapped card", () => {
  const { container } = render(
    <StreamdownMarkdown text={TABLE} isStreaming={false} />
  )
  const wrapper = container.querySelector("[data-streamdown='table-wrapper']")
  const actions = container.querySelector("[data-streamdown='table-actions']")
  expect(wrapper).toBeTruthy()
  expect(actions).toBeTruthy()
  expect(container.querySelector("table")).toBeTruthy()
  expect(container.querySelector("[title='View fullscreen']")).toBeNull()
  expect(
    container.querySelector("[data-streamdown='table-fullscreen']")
  ).toBeNull()
  expect(container.textContent).toContain("Promise")
  expect(container.textContent).toContain("Effect")
})

test("fenced typescript gets token colors", async () => {
  const { container } = render(
    <StreamdownMarkdown text={"```ts\nconst x = 1\n```"} isStreaming={false} />
  )
  await waitFor(
    () => {
      const colored = Array.from(container.querySelectorAll("span")).some(
        (node) => node.style.getPropertyValue("--sdm-c") !== ""
      )
      expect(colored).toBe(true)
    },
    { timeout: 10_000 }
  )
})
