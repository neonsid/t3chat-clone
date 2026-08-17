export function formatUserMessageClipboard(
  text: string,
  attachments: Array<{ filename: string; url: string }>
) {
  const trimmed = text.trim()
  if (attachments.length === 0) return trimmed
  const block = [
    "Attachments:",
    ...attachments.map(
      (attachment) => `[${attachment.filename}](${attachment.url})`
    ),
  ].join("\n")
  return trimmed ? `${trimmed}\n\n${block}` : block
}
