import { DifyClient } from "../src/clients/difyClient.ts";
import { LLMQueryService } from "../src/clients/llmClient.ts";
import { ok, err } from "npm:neverthrow";
import { LLMQuery, LLMQueryError } from "../src/llmQueries/aiQuery.ts";

class SimpleQuery<T> implements LLMQuery<T> {
  constructor(private prompt: string, private parser: (text: string) => T) {}

  buildPrompt(): string {
    return this.prompt;
  }

  parseResponse(response: string): ReturnType<LLMQuery<T>["parseResponse"]> {
    try {
      const result = this.parser(response);
      return ok(result);
    } catch (error) {
      const queryError: LLMQueryError = {
        type: "PARSE_ERROR",
        message: error instanceof Error ? error.message : String(error),
        originalError: error,
      };
      return err(queryError);
    }
  }
}

async function main() {
  const apiKey = Deno.env.get("DIFY_API_KEY") || "your-api-key";
  const applicationId = Deno.env.get("DIFY_APP_ID") || "your-app-id";

  const difyClient = new DifyClient(apiKey, applicationId);
  const llmQueryService = new LLMQueryService(difyClient);

  const textQuery = new SimpleQuery<string>(
    "東京の天気を教えてください",
    (text) => text
  );

  const jsonQuery = new SimpleQuery<{ summary: string; temperature: number }>(
    "東京の天気を要約と気温のJSONで返してください",
    (text) => {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
        text.match(/```\n([\s\S]*?)\n```/) || [null, text];
      return JSON.parse(jsonMatch[1]);
    }
  );

  console.log("テキストクエリの実行:");
  const textResult = await llmQueryService.execute(textQuery);

  if (textResult.isOk()) {
    console.log("結果:", textResult.value);
  } else {
    console.error("エラー:", textResult.error);
  }

  console.log("\nJSONクエリの実行:");
  const jsonResult = await llmQueryService.execute(jsonQuery);

  if (jsonResult.isOk()) {
    console.log("結果:", jsonResult.value);
    console.log("要約:", jsonResult.value.summary);
    console.log("気温:", jsonResult.value.temperature, "°C");
  } else {
    console.error("エラー:", jsonResult.error);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
