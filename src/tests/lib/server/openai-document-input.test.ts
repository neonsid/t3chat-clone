import { describe, expect, it } from "vitest"

import { openaiInputFileFromDocumentPart } from "@/lib/server/openai-document-input"

describe("openaiInputFileFromDocumentPart", () => {
  it("maps a signed pdf url to Responses input_file", () => {
    expect(
      openaiInputFileFromDocumentPart({
        type: "document",
        source: {
          type: "url",
          value: "https://example.com/doc.pdf",
          mimeType: "application/pdf",
        },
      })
    ).toEqual({
      type: "input_file",
      file_url: "https://example.com/doc.pdf",
    })
  })

  it("wraps raw base64 as a pdf data uri", () => {
    expect(
      openaiInputFileFromDocumentPart({
        type: "document",
        source: {
          type: "data",
          value: "AAAA",
          mimeType: "application/pdf",
        },
      })
    ).toEqual({
      type: "input_file",
      file_data: "data:application/pdf;base64,AAAA",
      filename: "document.pdf",
    })
  })

  it("keeps an existing data uri", () => {
    const fileData = "data:application/pdf;base64,BBBB"
    expect(
      openaiInputFileFromDocumentPart({
        type: "document",
        source: {
          type: "data",
          value: fileData,
          mimeType: "application/pdf",
        },
      })
    ).toEqual({
      type: "input_file",
      file_data: fileData,
      filename: "document.pdf",
    })
  })
})
