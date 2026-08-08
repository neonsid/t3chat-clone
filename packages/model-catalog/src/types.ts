export type ModelProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "deepseek"
  | "moonshotai"
  | "alibaba"
  | "zai"
  | "minimax"
  | "mistral"
  | "meta"
  | "cohere"

export type ModelProvider = {
  readonly id: ModelProviderId
  readonly name: string
}

export type ModelCapability =
  | "fast"
  | "vision"
  | "reasoning"
  | "effort-control"
  | "tool-calling"
  | "image-generation"
  | "pdf"

export type ModelActivity =
  | "chat"
  | "image-generation"
  | "video-generation"
  | "speech"
  | "transcription"
  | "realtime"
  | "embedding"
  | "agent"
  | "music"

export type ModelModality =
  "text" | "image" | "audio" | "video" | "document" | "embedding"

export type ModelCatalogEntry = {
  readonly id: string
  /** The provider's model id, without the provider prefix. */
  readonly modelId: string
  readonly providerId: ModelProviderId
  readonly name: string
  readonly description: string | null
  readonly activity: ModelActivity
  readonly inputModalities: ReadonlyArray<ModelModality>
  readonly outputModalities: ReadonlyArray<ModelModality>
  readonly capabilities: ReadonlyArray<ModelCapability>
  readonly contextTokens: number | null
  readonly outputTokens: number | null
  readonly inputCostPerMillion: number | null
  readonly outputCostPerMillion: number | null
  readonly knowledgeCutoff: string | null
  readonly releaseDate: string | null
  readonly lastUpdated: string | null
  readonly openWeights: boolean
  readonly experimental: boolean
}
