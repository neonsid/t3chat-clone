import { describe, expect, test } from "vitest"

import {
  rememberComposerPreviews,
  sentAttachmentsForMessage,
} from "@/lib/attachment-preview-cache"
import type { ComposerAttachment } from "@/stores/types"

function readyImage(
  overrides: Partial<ComposerAttachment> = {}
): ComposerAttachment {
  return {
    localId: "local-1",
    attachmentId: "att-1",
    filename: "1.png",
    mimeType: "image/png",
    kind: "image",
    sizeBytes: 12,
    status: "ready",
    progress: 1,
    localPreviewUrl: "blob:preview-1",
    ...overrides,
  }
}

describe("attachment preview cache", () => {
  test("keeps local previews on the latest user message until the query lands", () => {
    rememberComposerPreviews([readyImage()])

    expect(sentAttachmentsForMessage("msg-1", [], "msg-1")[0]?.src).toBe(
      "blob:preview-1"
    )
    expect(sentAttachmentsForMessage("older", [], "msg-1")).toEqual([])
    expect(
      sentAttachmentsForMessage(
        "msg-1",
        [
          {
            attachmentId: "att-1",
            messageId: "msg-1",
            filename: "1.png",
            kind: "image",
          },
        ],
        "msg-1"
      )[0]?.src
    ).toBe("blob:preview-1")
  })
})
