export interface LLMQuery<T> {
  buildPrompt(): string;
  parseResponse(response: string): T;
}
