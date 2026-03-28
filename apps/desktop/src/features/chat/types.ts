export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatRequest {
  prompt: string;
  model: string;
  provider: string;
  selectedCollectionId: string | null;
  vocabularyContext?: string[];
}

export interface ChatResponse {
  assistantMessage: string;
  tokenUsage: TokenUsage | null;
}
