import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.220.1/assert/mod.ts";
import { DifyClient } from "../../src/clients/difyClient.ts";

const createMockFetch = (responseData: unknown) => {
  return async (_url: string, _options: RequestInit) => {
    return {
      ok: true,
      json: async () => responseData,
    };
  };
};

const createErrorMockFetch = (status: number, statusText: string) => {
  return async (_url: string, _options: RequestInit) => {
    return {
      ok: false,
      status,
      statusText,
      json: async () => ({ error: "API error" }),
    };
  };
};

Deno.test(
  "DifyClient.post should send prompt and return response",
  async () => {
    const mockResponse = {
      answer: "This is a response from the AI model",
      conversation_id: "conv_123456",
      created_at: 1679825623,
      id: "msg_123456",
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = createMockFetch(mockResponse) as typeof fetch;

    try {
      const client = new DifyClient("test-api-key", "test-app-id");
      const result = await client.post("What is the capital of France?");

      if (!result.isOk()) {
        throw new Error("Result should be successful");
      }

      const response = result.value;

      assertExists(response);
      assertEquals(response, "This is a response from the AI model");

      console.log(
        "✅ テスト成功: プロンプトが正しく送信され、レスポンスが返されました"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);

Deno.test("DifyClient.post should handle API errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createErrorMockFetch(401, "Unauthorized") as typeof fetch;

  try {
    const client = new DifyClient("invalid-api-key", "test-app-id");
    const result = await client.post("What is the capital of France?");

    if (result.isOk()) {
      throw new Error("Result should be an error");
    }

    const error = result.error;

    assertExists(error);
    assertEquals(error instanceof Error, true);
    assertEquals(error.message.includes("HTTP error: 401"), true);

    console.log("✅ テスト成功: APIエラーが正しく処理されました");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("DifyClient.post should validate input parameters", async () => {
  const client = new DifyClient("test-api-key", "test-app-id");

  const result = await client.post("");

  if (result.isOk()) {
    throw new Error("Result should be an error for empty prompt");
  }

  assertEquals(result.error instanceof Error, true);
  assertEquals(result.error.message, "Prompt is required");

  console.log(
    "✅ テスト成功: 入力パラメータのバリデーションが正しく機能しました"
  );
});

Deno.test("DifyClient.post should handle invalid response format", async () => {
  const mockInvalidResponse = {
    conversation_id: "conv_123456",
    created_at: 1679825623,
    id: "msg_123456",
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(mockInvalidResponse) as typeof fetch;

  try {
    const client = new DifyClient("test-api-key", "test-app-id");
    const result = await client.post("What is the capital of France?");

    if (result.isOk()) {
      throw new Error("Result should be an error");
    }

    const error = result.error;

    assertExists(error);
    assertEquals(error instanceof Error, true);
    assertEquals(error.message, "Invalid response from Dify API");

    console.log("✅ テスト成功: 無効なレスポンス形式が正しく処理されました");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
