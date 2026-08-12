import { useConvex, useQuery } from "convex/react"
import { useEffect, useEffectEvent, useRef } from "react"

import { api } from "../../convex/_generated/api"
import {
  assertAttachmentCapacity,
  createPreparingAttachment,
  uploadComposerAttachment,
} from "@/lib/attachment-upload"
import { useChatUiStore, useChatUiStoreApi } from "@/stores/AppStateProvider"
import { getThreadComposerState } from "@/stores/chat-ui-store"
import type { ComposerAttachment } from "@/stores/types"

export function useComposerAttachments(threadStateKey: string) {
  const convex = useConvex()
  const chatUi = useChatUiStoreApi()
  const attachments = useChatUiStore(
    (state) => getThreadComposerState(state, threadStateKey).attachments
  )
  const abortControllers = useRef(new Map<string, AbortController>())
  const fileByLocalId = useRef(new Map<string, File>())

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
      if (remote.status === "ready" && local.status !== "ready") {
        chatUi.getState().updateAttachment(threadStateKey, local.localId, {
          status: "ready",
          progress: 1,
          errorMessage: undefined,
        })
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

  const abortAll = useEffectEvent(() => {
    for (const controller of abortControllers.current.values()) {
      controller.abort()
    }
    abortControllers.current.clear()
  })

  useEffect(() => {
    return () => {
      abortAll()
    }
  }, [abortAll, threadStateKey])

  async function addFiles(
    files: FileList | File[],
    options?: {
      onPreparing?: () => void
      onBatchStart?: (count: number) => void
      onRejected?: (message: string) => void
    }
  ) {
    const list = Array.from(files)
    if (list.length === 0) return []

    options?.onPreparing?.()
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
      fileByLocalId.current.set(entry.attachment.localId, entry.file)
      const controller = new AbortController()
      abortControllers.current.set(entry.attachment.localId, controller)
      void uploadComposerAttachment({
        convex,
        file: entry.file,
        attachment: entry.attachment,
        signal: controller.signal,
        onUpdate: (patch) => {
          if (controller.signal.aborted) return
          chatUi
            .getState()
            .updateAttachment(threadStateKey, entry.attachment.localId, patch)
        },
      }).finally(() => {
        abortControllers.current.delete(entry.attachment.localId)
        fileByLocalId.current.delete(entry.attachment.localId)
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

  function clearReadyAttachments() {
    const current = getThreadComposerState(
      chatUi.getState(),
      threadStateKey
    ).attachments
    for (const attachment of current) {
      if (attachment.localPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(attachment.localPreviewUrl)
      }
    }
    chatUi.getState().clearAttachments(threadStateKey)
  }

  return {
    attachments,
    addFiles,
    removeAttachment,
    clearReadyAttachments,
    abortAllUploads: abortAll,
  }
}
