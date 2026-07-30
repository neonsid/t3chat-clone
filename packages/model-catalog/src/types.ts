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
  | "perplexity"

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

export type ModelCatalogEntry = {
  readonly id: string
  /** The provider's model id, without the provider prefix. */
  readonly modelId: string
  readonly providerId: ModelProviderId
  readonly name: string
  readonly description: string | null
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
