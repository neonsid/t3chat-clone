import { MODEL_PROVIDERS } from "@t3chat/model-catalog"
import type { ModelCapability, ModelCatalogEntry } from "@t3chat/model-catalog"

const providerNames = new Map(
  MODEL_PROVIDERS.map((provider) => [provider.id, provider.name])
)

export function normalizeModelText(value: string) {
  return value.toLowerCase().replace(/[\s._-]+/g, "")
}

export function modelSearchHaystack(model: ModelCatalogEntry) {
  return normalizeModelText(
    `${model.name} ${model.modelId} ${
      providerNames.get(model.providerId) ?? model.providerId
    } ${model.description ?? ""}`
  )
}

export function modelMatchesCapabilities(
  modelCapabilities:
    ReadonlyArray<ModelCapability> | ReadonlySet<ModelCapability>,
  required: ReadonlyArray<ModelCapability>
) {
  if (required.length === 0) return true
  const available = new Set<ModelCapability>(modelCapabilities)
  return required.every((capability) => available.has(capability))
}
