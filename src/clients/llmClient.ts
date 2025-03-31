import { Result, ok, err } from "npm:neverthrow";
import { LLMQuery } from "../llmQueries/LLMQuery.ts";

export interface LLMClient {
  post(prompt: string): Promise<Result<string, Error>>;
}

export class LLMQueryService {
  constructor(private llmClient: LLMClient) {}

  async execute<T>(query: LLMQuery<T>): Promise<Result<T, Error>> {
    const prompt = query.buildPrompt();
    const result = await this.llmClient.post(prompt);

    if (result.isErr()) {
      return err(result.error);
    }

    try {
      const parsedResult = query.parseResponse(result.value);
      return ok(parsedResult);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
