import { Component, isValidElement, memo } from "react"
import type { ComponentProps, CSSProperties, ErrorInfo, ReactNode } from "react"
import {
  CodeBlockContainer,
  CodeBlockCopyButton,
  CodeBlockHeader,
  Streamdown,
  TableCopyDropdown,
  TableDownloadDropdown,
} from "streamdown"

import {
  CODE_BLOCK,
  STREAMDOWN_CODE_LANGUAGE_CLASS,
  STREAMDOWN_CONTROLS,
  STREAMDOWN_LINK_SAFETY,
} from "@/components/chat/thread/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { useHighlightedCode } from "@/hooks/useHighlightedCode"
import type { HighlightedToken } from "@/lib/highlight-code"
import { cn } from "@/lib/utils"

const INCOMPLETE_STREAMDOWN_HREF = "streamdown:incomplete-link"

function MarkdownLink({
  children,
  className,
  href,
  node: _node,
  ...rest
}: ComponentProps<"a"> & { node?: unknown }) {
  if (!href || href === INCOMPLETE_STREAMDOWN_HREF) {
    return (
      <span className={cn("font-medium underline", className)}>{children}</span>
    )
  }

  return (
    <a
      {...rest}
      className={cn("cursor-pointer font-medium underline", className)}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  )
}

function fenceCodeFromChildren(children: ReactNode): string {
  if (typeof children === "string") return children
  if (isValidElement(children)) {
    const nested = (children.props as { children?: ReactNode }).children
    if (typeof nested === "string") return nested
  }
  return ""
}

function fenceTokenStyle(token: HighlightedToken): CSSProperties | undefined {
  const style: Record<string, string> = {}
  if (token.htmlStyle) {
    for (const [key, value] of Object.entries(token.htmlStyle)) {
      if (key === "color") style["--sdm-c"] = value
      else if (key === "background-color") style["--sdm-tbg"] = value
      else style[key] = value
    }
  }
  if (token.color) style["--sdm-c"] = token.color
  if (token.bgColor) style["--sdm-tbg"] = token.bgColor
  return Object.keys(style).length > 0 ? style : undefined
}

function FenceCodeBody({ code, language }: { code: string; language: string }) {
  const highlighted = useHighlightedCode(code, language)

  return (
    <div className="overflow-x-auto" data-streamdown="code-block-body">
      <pre>
        <code>
          {highlighted.tokens.map((line, lineIndex) => (
            <span key={lineIndex}>
              {line.length === 0 ||
              (line.length === 1 && line[0]?.content === "")
                ? "\n"
                : line.map((token, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      className={cn(
                        "text-[var(--sdm-c,inherit)]",
                        token.bgColor && "bg-[var(--sdm-tbg)]",
                        "dark:text-[var(--shiki-dark,var(--sdm-c,inherit))]"
                      )}
                      style={fenceTokenStyle(token)}
                    >
                      {token.content}
                    </span>
                  ))}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

function MarkdownTable({
  children,
  className,
  node: _node,
  ...rest
}: ComponentProps<"table"> & { node?: unknown }) {
  return (
    <div
      className="my-4 w-full min-w-0 max-w-full overflow-hidden rounded-md border border-border bg-card"
      data-streamdown="table-wrapper"
    >
      <div
        className="flex h-9 items-center justify-end gap-1 px-2"
        data-streamdown="table-actions"
      >
        <TableCopyDropdown />
        <TableDownloadDropdown />
      </div>
      <div className="overflow-x-auto">
        <table
          className={cn(className, "w-max min-w-full divide-y divide-border")}
          data-streamdown="table"
          {...rest}
        >
          {children}
        </table>
      </div>
    </div>
  )
}

function FenceCopyButton({ code }: { code: string }) {
  return (
    <Tooltip content={CODE_BLOCK.copy}>
      <CodeBlockCopyButton
        aria-label={CODE_BLOCK.copy}
        code={code}
        title={undefined}
      />
    </Tooltip>
  )
}

function MarkdownCode({
  children,
  className,
  node: _node,
  ...rest
}: ComponentProps<"code"> & { node?: unknown; "data-block"?: string }) {
  if (!("data-block" in rest)) {
    return (
      <code
        className={cn(
          "rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm",
          className
        )}
        data-streamdown="inline-code"
        {...rest}
      >
        {children}
      </code>
    )
  }

  const language =
    className?.match(STREAMDOWN_CODE_LANGUAGE_CLASS)?.[1] ?? "text"
  const code = fenceCodeFromChildren(children)

  // Streamdown's CodeBlock lazy-loads a highlighter chunk that Vite cannot
  // serve (style-to-js CJS default export). Highlight here with Shiki instead.
  return (
    <CodeBlockContainer
      className={cn("relative", className)}
      language={language}
    >
      <CodeBlockHeader language={language} />
      <div className="pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end">
        <div
          className="pointer-events-auto flex shrink-0 items-center gap-2"
          data-streamdown="code-block-actions"
        >
          <FenceCopyButton code={code} />
        </div>
      </div>
      <FenceCodeBody code={code.replace(/\n$/, "")} language={language} />
    </CodeBlockContainer>
  )
}

const STREAMDOWN_COMPONENTS = {
  a: MarkdownLink,
  code: MarkdownCode,
  table: MarkdownTable,
}

type StreamdownMarkdownProps = {
  text: string
  isStreaming?: boolean
  className?: string
}

type MarkdownErrorBoundaryProps = {
  fallback: ReactNode
  children: ReactNode
  resetKey?: string
}

type MarkdownErrorBoundaryState = {
  hasError: boolean
  resetKey: string
}

class MarkdownErrorBoundary extends Component<
  MarkdownErrorBoundaryProps,
  MarkdownErrorBoundaryState
> {
  state: MarkdownErrorBoundaryState = { hasError: false, resetKey: "" }

  static getDerivedStateFromError(): Pick<
    MarkdownErrorBoundaryState,
    "hasError"
  > {
    return { hasError: true }
  }

  static getDerivedStateFromProps(
    props: MarkdownErrorBoundaryProps,
    state: MarkdownErrorBoundaryState
  ): MarkdownErrorBoundaryState | null {
    if (props.resetKey === undefined || props.resetKey === state.resetKey) {
      return null
    }
    return { hasError: false, resetKey: props.resetKey }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Markdown render failed", error, info)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export const StreamdownMarkdown = memo(function StreamdownMarkdown({
  text,
  isStreaming = false,
  className,
}: StreamdownMarkdownProps) {
  return (
    <MarkdownErrorBoundary
      fallback={
        <div className={cn("whitespace-pre-wrap", className)}>{text}</div>
      }
      resetKey={isStreaming ? "streaming" : "static"}
    >
      <div
        className={cn(
          "min-w-0 max-w-full text-[15px] leading-7 text-foreground/90 [&_[data-streamdown]]:min-w-0",
          className
        )}
      >
        <Streamdown
          // `animated` skips Streamdown's useTransition, which otherwise
          // commits whole blocks at once. `isAnimating` stays off so words
          // do not stagger-fade on separate clocks.
          animated={isStreaming}
          components={STREAMDOWN_COMPONENTS}
          controls={STREAMDOWN_CONTROLS}
          isAnimating={false}
          lineNumbers={false}
          linkSafety={STREAMDOWN_LINK_SAFETY}
          mode={isStreaming ? "streaming" : "static"}
        >
          {text}
        </Streamdown>
      </div>
    </MarkdownErrorBoundary>
  )
})
