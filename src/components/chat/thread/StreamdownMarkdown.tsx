import { Component, type ErrorInfo, type ReactNode } from "react"
import { Streamdown } from "streamdown"

import { STREAMDOWN_PLUGINS } from "@/components/chat/thread/constants"
import { cn } from "@/lib/utils"

type StreamdownMarkdownProps = {
  text: string
  isStreaming?: boolean
  className?: string
}

type MarkdownErrorBoundaryProps = {
  fallback: ReactNode
  children: ReactNode
}

type MarkdownErrorBoundaryState = {
  hasError: boolean
}

class MarkdownErrorBoundary extends Component<
  MarkdownErrorBoundaryProps,
  MarkdownErrorBoundaryState
> {
  state: MarkdownErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): MarkdownErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Streamdown failed to render markdown", error, info)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export function StreamdownMarkdown({
  text,
  isStreaming = false,
  className,
}: StreamdownMarkdownProps) {
  return (
    <MarkdownErrorBoundary
      fallback={
        <div className={cn("whitespace-pre-wrap", className)}>{text}</div>
      }
    >
      <div
        className={cn(
          "text-[15px] leading-7 text-foreground/90 [&_[data-streamdown]]:min-w-0",
          className
        )}
      >
        <Streamdown
          lineNumbers={false}
          mode={isStreaming ? "streaming" : "static"}
          plugins={STREAMDOWN_PLUGINS}
        >
          {text}
        </Streamdown>
      </div>
    </MarkdownErrorBoundary>
  )
}
