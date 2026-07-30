import type { ModelCapability } from "./types"

type ModelCapabilityDescriptor = {
  readonly id: ModelCapability
  readonly label: string
  readonly description: string
}

export const MODEL_CAPABILITIES: ReadonlyArray<ModelCapabilityDescriptor> = [
  {
    id: "fast",
    label: "Fast",
    description: "Low-latency tier of its family",
  },
  {
    id: "vision",
    label: "Vision",
    description: "Accepts image input",
  },
  {
    id: "reasoning",
    label: "Reasoning",
    description: "Thinks before answering",
  },
  {
    id: "effort-control",
    label: "Effort Control",
    description: "Reasoning depth can be tuned per request",
  },
  {
    id: "tool-calling",
    label: "Tool Calling",
    description: "Can call tools and functions",
  },
  {
    id: "image-generation",
    label: "Image Generation",
    description: "Returns generated images",
  },
  {
    id: "pdf",
    label: "PDF Comprehension",
    description: "Reads PDF attachments natively",
  },
]
