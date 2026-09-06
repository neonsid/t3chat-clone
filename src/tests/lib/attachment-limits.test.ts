import { describe, expect, it } from "vitest"

import {
  DOCX_MIME_TYPE,
  LEGACY_DOC_ERROR,
  MAX_WORD_ATTACHMENT_BYTES,
  normalizeAttachmentMimeType,
  validateAttachmentFile,
} from "@/lib/attachment-limits"

function fakeFile(name: string, type: string, size: number) {
  const file = new File([new Uint8Array(Math.min(size, 8))], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

describe("normalizeAttachmentMimeType", () => {
  it("accepts a .docx filename when the browser leaves type empty", () => {
    expect(
      normalizeAttachmentMimeType({ name: "notes.docx", type: "" })
    ).toBe(DOCX_MIME_TYPE)
  })

  it("does not treat legacy .doc as Word", () => {
    expect(
      normalizeAttachmentMimeType({ name: "old.doc", type: "" })
    ).toBeNull()
  })
})

describe("validateAttachmentFile", () => {
  it("accepts a Word file under the 5MB cap", () => {
    expect(
      validateAttachmentFile(fakeFile("brief.docx", DOCX_MIME_TYPE, 1024))
    ).toEqual({
      ok: true,
      mimeType: DOCX_MIME_TYPE,
      kind: "docx",
    })
  })

  it("rejects legacy .doc with save-as copy", () => {
    expect(
      validateAttachmentFile(
        fakeFile("old.doc", "application/msword", 1024)
      )
    ).toEqual({ ok: false, error: LEGACY_DOC_ERROR })
  })

  it("rejects an oversized Word file", () => {
    const result = validateAttachmentFile(
      fakeFile("huge.docx", DOCX_MIME_TYPE, MAX_WORD_ATTACHMENT_BYTES + 1)
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("5MB")
  })

  it("still allows a 6MB PDF", () => {
    expect(
      validateAttachmentFile(
        fakeFile("doc.pdf", "application/pdf", 6 * 1024 * 1024)
      )
    ).toMatchObject({ ok: true, kind: "pdf" })
  })
})
