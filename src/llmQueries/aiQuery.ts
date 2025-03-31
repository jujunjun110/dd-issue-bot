import { Result } from "npm:neverthrow";

export type LLMQueryError = {
  type: "PARSE_ERROR" | "FORMAT_ERROR";
  message: string;
  originalError?: unknown;
};

export interface LLMQuery<T> {
  buildPrompt(): string;
  parseResponse(response: string): Result<T, LLMQueryError>;
}
