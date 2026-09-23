import { useConvex, useQuery } from "convex/react"
import { useEffect, useEffectEvent, useRef } from "react"

import { api } from "../../convex/_generated/api"
import { applyComposerContextGate } from "@/lib/attachment-context"
import {
  assertAttachmentCapacity,
  createPreparingAttachment,
  uploadComposerAttachment,
} from "@/lib/attachment-upload"
import { useChatUiStore, useChatUiStoreApi } from "@/stores/AppStateProvider"
import { getThreadComposerState } from "@/stores/chat-ui-store"
import type { ComposerAttachment } from "@/stores/types"

export function useComposerAttachments(
  threadStateKey: string,
  contextGate?: {
    threadTokensWithoutComposerDocx: number
    inputBudget: number | null
    modelName: string
  }
) {
  const convex = useConvex()
  const chatUi = useChatUiStoreApi()
  const attachments = useChatUiStore(
    (state) => getThreadComposerState(state, threadStateKey).attachments
  )
  const abortControllers = useRef(new Map<string, AbortController>())

  const processingIds = attachments
    .filter(
      (attachment) =>
        attachment.status === "processing" && attachment.attachmentId
    )
    .map((attachment) => attachment.attachmentId!)

  const remoteStatuses = useQuery(
    api.attachments.listByIds,
    processingIds.length > 0 ? { attachmentIds: processingIds } : "skip"
  )

  useEffect(() => {
    if (!remoteStatuses) return
    for (const remote of remoteStatuses) {
      const local = attachments.find(
        (attachment) => attachment.attachmentId === remote.attachmentId
      )
      if (!local) continue
      if (remote.status === "ready") {
        const stillUploading =
          local.status === "preparing" ||
          local.status === "uploading" ||
          local.status === "processing"
        if (
          stillUploading ||
          local.extractedTokenEstimate !== remote.extractedTokenEstimate
        ) {
          if (stillUploading) {
            chatUi.getState().updateAttachment(threadStateKey, local.localId, {
              status: "ready",
              progress: 1,
              extractedTokenEstimate: remote.extractedTokenEstimate,
              errorMessage: undefined,
              contextWarning: undefined,
            })
          } else {
            chatUi.getState().updateAttachment(threadStateKey, local.localId, {
              status: local.status,
              progress: 1,
              extractedTokenEstimate: remote.extractedTokenEstimate,
            })
          }
        }
      } else if (remote.status === "failed" && local.status !== "failed") {
        chatUi.getState().updateAttachment(threadStateKey, local.localId, {
          status: "failed",
          errorMessage: remote.errorMessage ?? "Verification failed",
        })
      } else if (
        remote.status === "processing" &&
        local.status !== "processing"
      ) {
        chatUi.getState().updateAttachment(threadStateKey, local.localId, {
          status: "processing",
        })
      }
    }
  }, [attachments, chatUi, remoteStatuses, threadStateKey])

  useEffect(() => {
    if (!contextGate) return
    const current = getThreadComposerState(
      chatUi.getState(),
      threadStateKey
    ).attachments
    const next = applyComposerContextGate(current, contextGate)
    if (!composerAttachmentsChanged(current, next)) return
    chatUi.getState().setAttachments(threadStateKey, next)
  }, [attachments, chatUi, contextGate, threadStateKey])

  const abortAll = useEffectEvent(() => {
    for (const controller of abortControllers.current.values()) {
      controller.abort()
    }
    abortControllers.current.clear()
  })

  // useEffectEvent must stay out of the dep list — including it retriggers
  // cleanup on re-render and aborts the in-flight createUploadIntent, which
  // leaves chips stuck on "Preparing…".
  useEffect(() => {
    return () => {
      abortAll()
    }
  }, [threadStateKey])

  async function addFiles(
    files: FileList | File[],
    options?: {
      onBatchStart?: (count: number) => void
      onRejected?: (message: string) => void
    }
  ) {
    const list = Array.from(files)
    if (list.length === 0) return []
    const capacityError = assertAttachmentCapacity(
      getThreadComposerState(chatUi.getState(), threadStateKey).attachments
        .length,
      list.length
    )
    if (capacityError) {
      options?.onRejected?.(capacityError)
      return []
    }

    const prepared: Array<{ attachment: ComposerAttachment; file: File }> = []
    for (const file of list) {
      const result = createPreparingAttachment(file)
      if ("error" in result) {
        options?.onRejected?.(result.error)
        continue
      }
      prepared.push({ attachment: result, file })
    }
    if (prepared.length === 0) return []

    const nextAttachments = [
      ...getThreadComposerState(chatUi.getState(), threadStateKey).attachments,
      ...prepared.map((entry) => entry.attachment),
    ]
    chatUi.getState().setAttachments(threadStateKey, nextAttachments)
    options?.onBatchStart?.(prepared.length)

    for (const entry of prepared) {
      const controller = new AbortController()
      abortControllers.current.set(entry.attachment.localId, controller)
      void uploadComposerAttachment({
        convex,
        file: entry.file,
        attachment: entry.attachment,
        signal: controller.signal,
        onUpdate: (patch) => {
          chatUi
            .getState()
            .updateAttachment(threadStateKey, entry.attachment.localId, patch)
        },
      }).finally(() => {
        abortControllers.current.delete(entry.attachment.localId)
      })
    }

    return prepared.map((entry) => entry.attachment.localId)
  }

  async function removeAttachment(localId: string) {
    const controller = abortControllers.current.get(localId)
    controller?.abort()
    abortControllers.current.delete(localId)

    const current = getThreadComposerState(
      chatUi.getState(),
      threadStateKey
    ).attachments
    const target = current.find((attachment) => attachment.localId === localId)
    chatUi.getState().removeAttachment(threadStateKey, localId)
    if (target?.attachmentId) {
      await convex
        .mutation(api.attachments.discard, {
          attachmentId: target.attachmentId,
        })
        .catch(() => undefined)
    }
  }

  return {
    attachments,
    addFiles,
    removeAttachment,
    abortAllUploads: abortAll,
  }
}

function composerAttachmentsChanged(
  left: Array<ComposerAttachment>,
  right: Array<ComposerAttachment>
) {
  if (left.length !== right.length) return true
  return left.some((attachment, index) => {
    const other = right[index]
    if (!other) return true
    return (
      attachment.status !== other.status ||
      attachment.errorMessage !== other.errorMessage ||
      attachment.contextWarning !== other.contextWarning ||
      attachment.extractedTokenEstimate !== other.extractedTokenEstimate
    )
  })
}
