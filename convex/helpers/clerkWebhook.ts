import { z } from "zod"

const SVIX_TOLERANCE_MS = 5 * 60 * 1000

export const clerkDeletedUserEvent = z.object({
  type: z.literal("user.deleted"),
  data: z.object({
    id: z.string().min(1),
  }),
})

export function parseClerkDeletedWebhook(payload: string) {
  try {
    const event = clerkDeletedUserEvent.safeParse(JSON.parse(payload))
    if (!event.success) return { kind: "ignored" as const }
    return { kind: "user.deleted" as const, clerkUserId: event.data.data.id }
  } catch {
    return { kind: "invalid-json" as const }
  }
}

export async function verifySvixSignature(
  payload: string,
  headers: Headers,
  secret: string
) {
  const id = headers.get("svix-id")
  const timestamp = headers.get("svix-timestamp")
  const signatureHeader = headers.get("svix-signature")
  if (!id || !timestamp || !signatureHeader) return false

  const timestampMs = Number(timestamp) * 1000
  if (!Number.isFinite(timestampMs)) return false
  if (Math.abs(Date.now() - timestampMs) > SVIX_TOLERANCE_MS) return false

  const secretBytes = decodeSvixSecret(secret)
  if (!secretBytes) return false

  const signed = `${id}.${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signed)
  )
  const expected = encodeBase64(new Uint8Array(signature))

  return signatureHeader.split(" ").some((part) => {
    const signatureValue = part.split(",")[1]
    if (!signatureValue) return false
    return timingSafeEqual(signatureValue, expected)
  })
}

function decodeSvixSecret(secret: string) {
  const encoded = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret
  try {
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return null
  }
}

function encodeBase64(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return mismatch === 0
}
