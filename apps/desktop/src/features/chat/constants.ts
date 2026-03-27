export const SUPPORTED_MODELS = [
  { id: "arcee-ai/trinity-large-preview:free", label: "Arcee AI: Trinity Large Preview (free)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (Free)" },
  { id: "google/gemini-flash-1.5", label: "Gemini Flash 1.5" },
] as const;

export const NO_COLLECTION_LABEL = "No collection";

export const ERROR_COPY = {
  KEY_REQUIRED: "No API key saved. Go to Profile to add your OpenRouter key.",
  NOT_FOUND: "The selected collection could not be found or is empty.",
  INVALID_INPUT: "Invalid request. Please check your input and try again.",
  UNEXPECTED_ERROR: "Something went wrong. Please try again.",
  NO_MODEL_SELECTED: "Please select a model before sending.",
} as const;
