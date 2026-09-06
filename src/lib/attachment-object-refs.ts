export function shouldDeleteSharedObject({
  batchDocIds,
  siblings,
}: {
  batchDocIds: ReadonlySet<string>
  siblings: Array<{ _id: string; status: string }>
}) {
  return !siblings.some(
    (sibling) =>
      !batchDocIds.has(sibling._id) && sibling.status !== "deleting"
  )
}
