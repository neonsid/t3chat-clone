import type { DocumentPart } from "@tanstack/ai"

export type OpenAIInputFile =
  | {
      type: "input_file"
      file_url: string
    }
  | {
      type: "input_file"
      file_data: string
      filename: string
    }

/**
 * OpenAI Responses accepts PDFs as `input_file`, not TanStack `document` parts.
 * URL sources use `file_url`; inline data is wrapped as a data URI.
 */
export function openaiInputFileFromDocumentPart(
  part: DocumentPart
): OpenAIInputFile {
  if (part.source.type === "url") {
    return {
      type: "input_file",
      file_url: part.source.value,
    }
  }

  const mimeType = part.source.mimeType || "application/pdf"
  const value = part.source.value
  return {
    type: "input_file",
    file_data: value.startsWith("data:")
      ? value
      : `data:${mimeType};base64,${value}`,
    filename: "document.pdf",
  }
}
