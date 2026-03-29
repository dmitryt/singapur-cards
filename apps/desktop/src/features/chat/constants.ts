/** User-facing model title for the chat header; falls back to the raw OpenRouter id. */
export function resolveChatModelLabel(modelId: string | null | undefined): string {
  if (!modelId?.trim()) return "Assistant";
  return modelId;
}

export const SUPPORTED_PROVIDERS = [
  { key: "openrouter", value: "openrouter", text: "OpenRouter" },
] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number]["value"];

export const NO_COLLECTION_LABEL = "No collection";

export const ERROR_COPY = {
  KEY_REQUIRED: "No API key saved. Go to Profile to add your OpenRouter key.",
  NOT_FOUND: "The selected collection could not be found or is empty.",
  INVALID_INPUT: "Invalid request. Please check your input and try again.",
  UNEXPECTED_ERROR: "Something went wrong. Please try again.",
  NO_MODEL_SELECTED: "Please select a model before sending.",
} as const;
