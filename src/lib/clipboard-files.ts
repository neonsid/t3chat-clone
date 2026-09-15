type ClipboardFileItem = {
  kind: string
  getAsFile: () => File | null
}

export function namedClipboardFile(file: File) {
  if (file.name.trim()) return file
  const subtype = file.type.split("/")[1]?.split("+")[0]
  const ext = subtype === "jpeg" ? "jpg" : subtype
  return new File([file], ext ? `image.${ext}` : "image.png", {
    type: file.type || "image/png",
  })
}

export function filesFromClipboard(clipboard: {
  files: ArrayLike<File>
  items?: ArrayLike<ClipboardFileItem>
}) {
  const listed = Array.from(clipboard.files, namedClipboardFile)
  if (listed.length > 0) return listed

  const fromItems: File[] = []
  for (const item of Array.from(clipboard.items ?? [])) {
    if (item.kind !== "file") continue
    const file = item.getAsFile()
    if (file) fromItems.push(namedClipboardFile(file))
  }
  return fromItems
}
