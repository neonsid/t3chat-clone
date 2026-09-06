import { describe, expect, it } from "vitest"

import {
  collectBranchAttachmentIds,
  forkTemporaryThread,
  remapKeyedRecord,
  sliceMessagesThrough,
} from "@/lib/thread-branch"
import type { PersistableTemporaryMessage, StoredTemporaryThread } from "@/lib/temporary-chat"

const messages: PersistableTemporaryMessage[] = [
  {
    messageId: "u1",
    role: "user",
    content: "Hi",
    status: "complete",
    createdAt: 1,
    attachmentIds: ["att-1"],
  },
  {
    messageId: "a1",
    role: "assistant",
    content: "Hello",
    status: "complete",
    createdAt: 2,
  },
  {
    messageId: "u2",
    role: "user",
    content: "More",
    status: "complete",
    createdAt: 3,
  },
]

const source: StoredTemporaryThread = {
  id: "tmp-source",
  title: "Kept title",
  titleSource: "manual",
  createdAt: 1,
  updatedAt: 3,
  messages,
  generationStats: {
    a1: {
      modelName: "GPT-5.6 Terra",
      mode: "Instant",
      outputTokens: 4,
      tokensPerSecond: 1,
      timeToFirstTokenSeconds: 0.2,
    },
  },
  stoppedMessageIds: ["a1"],
}

describe("sliceMessagesThrough", () => {
  it("keeps the branch point and drops later messages", () => {
    expect(
      sliceMessagesThrough(messages, "a1")?.map((message) => message.messageId)
    ).toEqual(["u1", "a1"])
  })

  it("returns null when the message is missing", () => {
    expect(sliceMessagesThrough(messages, "missing")).toBeNull()
  })
})

describe("forkTemporaryThread", () => {
  it("remaps message ids, attachment ids, and generation stats", () => {
    let next = 0
    const forked = forkTemporaryThread({
      source,
      throughMessageId: "a1",
      newThreadId: "tmp-branch",
      attachmentIdMap: { "att-1": "att-clone" },
      createId: () => `id-${++next}`,
      now: 99,
    })

    expect(forked).not.toBeNull()
    expect(forked?.id).toBe("tmp-branch")
    expect(forked?.title).toBe("Kept title")
    expect(forked?.messages.map((message) => message.messageId)).toEqual([
      "id-1",
      "id-2",
    ])
    expect(forked?.messages[0]?.attachmentIds).toEqual(["att-clone"])
    expect(forked?.generationStats["id-2"]?.outputTokens).toBe(4)
    expect(forked?.stoppedMessageIds).toEqual(["id-2"])
    expect(forked?.messages.some((message) => message.messageId === "u2")).toBe(
      false
    )
    expect(source.messages).toHaveLength(3)
    expect(source.messages[0]?.attachmentIds).toEqual(["att-1"])
    expect(forked?.branchedFromThreadId).toBe("tmp-source")
  })

  it("collects attachment ids from the sliced prefix", () => {
    expect(collectBranchAttachmentIds(messages.slice(0, 2))).toEqual(["att-1"])
  })

  it("remaps only keys present in the id map", () => {
    expect(
      remapKeyedRecord({ a1: 1, extra: 2 }, { a1: "new-a1" })
    ).toEqual({ "new-a1": 1 })
  })
})
