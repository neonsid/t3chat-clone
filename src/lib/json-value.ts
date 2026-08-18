export type JsonObject = { readonly [key: string]: JsonValue }
export type JsonValue =
  string | number | boolean | null | JsonValue[] | JsonObject

export function isJsonString(value: JsonValue | undefined): value is string {
  return value != null && value.constructor === String
}

export function isJsonNumber(value: JsonValue | undefined): value is number {
  return value != null && value.constructor === Number
}

export function isJsonBoolean(value: JsonValue | undefined): value is boolean {
  return value != null && value.constructor === Boolean
}

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return value != null && !Array.isArray(value) && value.constructor === Object
}

export function parseJsonValue(raw: string): JsonValue | null {
  try {
    // SAFETY: JSON.parse is untyped; JSON text decodes to JsonValue or throws.
    return JSON.parse(raw) as JsonValue
  } catch {
    return null
  }
}
