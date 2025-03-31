import { Result, ok, err } from "npm:neverthrow";
import { LLMClient } from "./llmClient.ts";

export type DifyError = {
  type: "API_ERROR" | "NETWORK_ERROR" | "INVALID_INPUT";
  message: string;
  originalError?: unknown;
};

export class DifyClient implements LLMClient {
  constructor(
    private apiKey: string,
    private applicationId: string,
    private baseUrl: string = "https://api.dify.ai/v1"
  ) {}

  async post(prompt: string): Promise<Result<string, Error>> {
    if (!prompt) {
      return err(new Error("Prompt is required"));
    }

    try {
      const url = `${this.baseUrl}/chat-messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: this.applicationId,
          inputs: {},
          query: prompt,
          response_mode: "blocking",
          user: "user",
        }),
      });

      if (!response.ok) {
        return err(
          new Error(`HTTP error: ${response.status} ${response.statusText}`)
        );
      }

      const data = await response.json();

      if (!data.answer) {
        return err(new Error("Invalid response from Dify API"));
      }

      return ok(data.answer);
    } catch (error) {
      return err(
        new Error(
          `Failed to communicate with Dify API: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }
}
