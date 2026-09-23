import { memo, useState } from "react";
import type { UIMessage } from "@tanstack/ai-react";
import { useAction } from "convex/react";
import {
  CheckIcon,
  CircleSlashIcon,
  Clock3Icon,
  CopyIcon,
  CpuIcon,
  GlobeIcon,
  Undo2Icon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { MessageAttachments } from "@/components/chat/attachments/MessageAttachments";
import type { ThreadMessageAttachment } from "@/components/chat/attachments/types";
import { ReasoningBlock } from "@/components/chat/thread/ReasoningBlock";
import { StreamdownMarkdown } from "@/components/chat/thread/StreamdownMarkdown";
import { WebSearchBlock } from "@/components/chat/thread/WebSearchBlock";
import { showShellToast } from "@/components/chat/shell/shell-toast";
import { MessageBranchPicker } from "@/components/chat/thread/MessageBranchPicker";
import { MessageRetryPicker } from "@/components/chat/thread/MessageRetryPicker";
import type { MessageModelAction } from "@/components/chat/thread/MessageModelActionPicker";
import { MESSAGE_COPY, STOPPED_RESPONSE } from "@/components/chat/thread/constants";
import {
  resolveAssistantMessageChrome,
  splitThinkingAroundSearch,
  webSearchToolCallCount,
  webSearchToolCallLabel,
} from "@/components/chat/thread/logic";
import { Button } from "@/components/shared/ui/button";
import { formatUserMessageClipboard } from "@/lib/attachment-clipboard";
import { chatMessageText, chatMessageThinking, formatShortTimestamp } from "@/lib/threads";
import type { AssistantGenerationStats } from "@/lib/threads";
import type { WebSearchSource } from "@/lib/web-search";

const messageActionButtonClassName =
  "size-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground";

async function copyText(text: string) {
  if (!text) return;
  await navigator.clipboard.writeText(text);
}

function MessageCopyControl({
  text,
  attachments = [],
  onCopied,
}: {
  text: string;
  attachments?: Array<ThreadMessageAttachment>;
  onCopied?: () => void;
}) {
  const getDownloadUrl = useAction(api.r2.getDownloadUrl);
  const [copied, setCopied] = useState(false);
  if (!text && attachments.length === 0) return null;

  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      className={messageActionButtonClassName}
      aria-label={copied ? "Copied" : "Copy message"}
      onClick={() => {
        void (async () => {
          try {
            const links: Array<{ filename: string; url: string }> = [];
            for (const attachment of attachments) {
              if (attachment.src) {
                links.push({
                  filename: attachment.filename,
                  url: attachment.src,
                });
                continue;
              }
              if (attachment.hideDownload) continue;
              try {
                const result = await getDownloadUrl({
                  attachmentId: attachment.attachmentId,
                  purpose: "ui",
                });
                links.push({ filename: attachment.filename, url: result.url });
              } catch {
                continue;
              }
            }
            await copyText(formatUserMessageClipboard(text, links));
            onCopied?.();
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          } catch {
            return;
          }
        })();
      }}
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
    </Button>
  );
}

type ChatMessageProps = {
  message: UIMessage;
  isStreaming?: boolean;
  isStopped?: boolean;
  isTemporary?: boolean;
  generationStats?: AssistantGenerationStats;
  attachments?: Array<ThreadMessageAttachment>;
  sources?: WebSearchSource[];
  queries?: string[];
  thinkingSearchSplitAt?: number;
  isSearchingWeb?: boolean;
  canBranch?: boolean;
  onBranch?: () => void | Promise<void>;
  canRetry?: boolean;
  onRetry?: (action?: MessageModelAction) => void | Promise<void>;
  readOnly?: boolean;
};

export const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming = false,
  isStopped = false,
  isTemporary = false,
  generationStats,
  attachments = [],
  sources = [],
  queries = [],
  thinkingSearchSplitAt,
  isSearchingWeb = false,
  canBranch = false,
  onBranch,
  canRetry = false,
  onRetry,
  readOnly = false,
}: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <UserMessage
        message={message}
        isTemporary={isTemporary}
        attachments={attachments}
        canBranch={canBranch}
        onBranch={onBranch}
        readOnly={readOnly}
      />
    );
  }

  return (
    <AssistantMessage
      message={message}
      isStreaming={isStreaming}
      isStopped={isStopped}
      isTemporary={isTemporary}
      generationStats={generationStats}
      sources={sources}
      queries={queries}
      thinkingSearchSplitAt={thinkingSearchSplitAt}
      isSearchingWeb={isSearchingWeb}
      canBranch={canBranch}
      onBranch={onBranch}
      canRetry={canRetry}
      onRetry={onRetry}
      readOnly={readOnly}
    />
  );
});

function UserMessage({
  message,
  isTemporary,
  attachments,
  canBranch,
  onBranch,
  readOnly,
}: {
  message: UIMessage;
  isTemporary: boolean;
  attachments: Array<ThreadMessageAttachment>;
  canBranch: boolean;
  onBranch?: () => void | Promise<void>;
  readOnly: boolean;
}) {
  const text = chatMessageText(message);
  const timestamp = isTemporary ? "" : formatShortTimestamp(message.createdAt);
  if (!text && attachments.length === 0) return null;

  return (
    <div className="group flex w-full min-w-0 flex-col items-end gap-1">
      <div className="relative max-w-[80%] min-w-0 overflow-x-auto rounded-md border border-border/70 bg-[var(--message-surface,var(--accent))] p-3 text-[15px] leading-6 text-[var(--message-foreground,var(--foreground))]">
        {attachments.length > 0 ? (
          <div className={text ? "mb-2" : undefined}>
            <MessageAttachments attachments={attachments} />
          </div>
        ) : null}
        {text ? <div className="[overflow-wrap:anywhere] whitespace-pre-wrap">{text}</div> : null}
      </div>
      <div className="flex w-full max-w-[80%] items-center justify-end pe-1 text-xs tabular-nums opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
        <div className="flex shrink-0 items-center gap-2">
          {timestamp ? (
            <p className="text-xs text-muted-foreground tabular-nums">{timestamp}</p>
          ) : null}
          <div className="flex items-center gap-0.5">
            {readOnly ? null : (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className={messageActionButtonClassName}
                aria-label="Reply"
                disabled
              >
                <Undo2Icon className="size-3.5" />
              </Button>
            )}
            {text || attachments.length > 0 ? (
              <MessageCopyControl text={text} attachments={attachments} />
            ) : null}
            {readOnly ? null : <MessageBranchPicker disabled={!canBranch} onBranch={onBranch} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  isStreaming,
  isStopped,
  isTemporary,
  generationStats,
  sources,
  queries,
  thinkingSearchSplitAt,
  isSearchingWeb,
  canBranch,
  onBranch,
  canRetry,
  onRetry,
  readOnly,
}: {
  message: UIMessage;
  isStreaming: boolean;
  isStopped: boolean;
  isTemporary: boolean;
  generationStats?: AssistantGenerationStats;
  sources: WebSearchSource[];
  queries: string[];
  thinkingSearchSplitAt?: number;
  isSearchingWeb: boolean;
  canBranch: boolean;
  onBranch?: () => void | Promise<void>;
  canRetry: boolean;
  onRetry?: (action?: MessageModelAction) => void | Promise<void>;
  readOnly: boolean;
}) {
  const text = chatMessageText(message);
  const thinking = chatMessageThinking(message);
  const { before: thinkingBefore, after: thinkingAfter } = splitThinkingAroundSearch(
    thinking,
    thinkingSearchSplitAt,
  );
  const timestamp = isTemporary ? "" : formatShortTimestamp(message.createdAt);
  const hideRateAndLatency = isTemporary || isStopped;
  const toolCallCount = webSearchToolCallCount(queries.length, sources.length);
  const {
    showReasoningBefore,
    showReasoningAfter,
    isStreamingThinkingBefore,
    isStreamingThinkingAfter,
    showWebSearch,
    isSearching,
  } = resolveAssistantMessageChrome({
    thinkingBefore,
    thinkingAfter,
    text,
    isStreaming,
    sourcesCount: sources.length,
    queriesCount: queries.length,
    isSearchingWeb,
  });

  return (
    <div className="group/assistant pb-2">
      <div className="relative min-w-0 px-1 py-0.5">
        {showReasoningBefore ? (
          <ReasoningBlock
            content={thinkingBefore}
            isStreamingThinking={isStreamingThinkingBefore}
          />
        ) : null}

        {showWebSearch ? (
          <WebSearchBlock sources={sources} queries={queries} isSearching={isSearching} />
        ) : null}

        {showReasoningAfter ? (
          <ReasoningBlock content={thinkingAfter} isStreamingThinking={isStreamingThinkingAfter} />
        ) : null}

        {text ? <StreamdownMarkdown text={text} isStreaming={isStreaming} /> : null}

        {isStopped && !isStreaming ? (
          <p
            role="status"
            className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <CircleSlashIcon aria-hidden="true" className="size-4 shrink-0" />
            {STOPPED_RESPONSE.label}
          </p>
        ) : null}

        {(text || timestamp || generationStats || toolCallCount > 0) && !isStreaming ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums opacity-0 transition-opacity duration-200 group-hover/assistant:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
            <div className="flex items-center gap-0.5">
              {text ? (
                <MessageCopyControl
                  text={text}
                  onCopied={() =>
                    showShellToast({
                      title: MESSAGE_COPY.copied,
                      status: "success",
                      duration: MESSAGE_COPY.toastDurationMs,
                    })
                  }
                />
              ) : null}
              {readOnly ? null : (
                <>
                  <MessageBranchPicker disabled={!canBranch} onBranch={onBranch} />
                  <MessageRetryPicker disabled={!canRetry} onRetry={onRetry} />
                </>
              )}
            </div>
            <AssistantGenerationStatsRow
              generationStats={generationStats}
              hideRateAndLatency={hideRateAndLatency}
              isStopped={isStopped}
              toolCallCount={toolCallCount}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AssistantGenerationStatsRow({
  generationStats,
  hideRateAndLatency,
  isStopped,
  toolCallCount,
}: {
  generationStats?: AssistantGenerationStats;
  hideRateAndLatency: boolean;
  isStopped: boolean;
  toolCallCount: number;
}) {
  if (!generationStats && toolCallCount === 0) return null;
  if (!generationStats) {
    return (
      <span className="inline-flex items-center gap-1">
        <WrenchIcon aria-hidden="true" className="size-3.5" />
        {webSearchToolCallLabel(toolCallCount)}
      </span>
    );
  }

  return (
    <div
      data-assistant-generation-stats="true"
      aria-label="Response generation statistics"
      className="flex flex-wrap items-center gap-x-3 gap-y-1"
    >
      <span className="inline-flex items-center gap-1 font-semibold text-foreground/75">
        {generationStats.modelName} ({generationStats.mode})
        {toolCallCount > 0 ? (
          <GlobeIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
        ) : null}
      </span>
      {hideRateAndLatency ? (
        <span className="inline-flex items-center gap-1">
          <CpuIcon aria-hidden="true" className="size-3.5" />
          {isStopped ? "~" : null}
          {generationStats.outputTokens.toLocaleString()} tokens
        </span>
      ) : (
        <>
          <span className="inline-flex items-center gap-1">
            <ZapIcon aria-hidden="true" className="size-3.5" />
            {generationStats.tokensPerSecond.toFixed(2)} tok/sec
          </span>
          <span className="inline-flex items-center gap-1">
            <CpuIcon aria-hidden="true" className="size-3.5" />
            {generationStats.outputTokens.toLocaleString()} tokens
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3Icon aria-hidden="true" className="size-3.5" />
            Time-to-First: {generationStats.timeToFirstTokenSeconds.toFixed(4)} sec
          </span>
        </>
      )}
      {toolCallCount > 0 ? (
        <span className="inline-flex items-center gap-1">
          <WrenchIcon aria-hidden="true" className="size-3.5" />
          {webSearchToolCallLabel(toolCallCount)}
        </span>
      ) : null}
    </div>
  );
}
