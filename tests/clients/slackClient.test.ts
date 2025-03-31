import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.220.1/assert/mod.ts";
import {
  SlackClient,
  SlackThreadResponse,
} from "../../src/clients/slackClient.ts";

// モックフェッチの実装
// deno-lint-ignore no-explicit-any
const createMockFetch = (responseData: any) => {
  // deno-lint-ignore require-await
  return async (_url: string, _options: RequestInit) => {
    return {
      ok: true,
      // deno-lint-ignore require-await
      json: async () => responseData,
    };
  };
};

Deno.test(
  "SlackClient.getThreadReplies should fetch thread messages",
  async () => {
    // モックレスポンスデータ
    const mockThreadResponse: SlackThreadResponse = {
      ok: true,
      messages: [
        {
          ts: "1616461034.001000",
          text: "<@U12345678> ログイン画面でエラーが発生しています",
          user: "U87654321",
          thread_ts: "1616461034.001000",
        },
        {
          ts: "1616461044.001100",
          text: "詳細: ユーザーがログインボタンをクリックした後、エラーメッセージが表示されずに画面がフリーズします",
          user: "U87654321",
          thread_ts: "1616461034.001000",
        },
        {
          ts: "1616461054.001200",
          text: "再現手順:\n1. ログイン画面にアクセス\n2. メールアドレスとパスワードを入力\n3. ログインボタンをクリック\n4. 画面がフリーズし、何も表示されない",
          user: "U87654321",
          thread_ts: "1616461034.001000",
        },
      ],
      has_more: false,
    };

    // グローバルfetchをモックに置き換え
    const originalFetch = globalThis.fetch;
    globalThis.fetch = createMockFetch(mockThreadResponse) as typeof fetch;

    try {
      const client = new SlackClient("xoxb-test-token");
      const result = await client.getThreadReplies(
        "C12345678",
        "1616461034.001000"
      );

      // 結果が成功であることを確認
      if (!result.isOk()) {
        throw new Error("Result should be successful");
      }

      const response = result.value;

      // レスポンスの検証
      assertEquals(response.ok, true);
      assertExists(response.messages);
      assertEquals(response.messages?.length, 3);
      assertEquals(
        response.messages?.[0].text,
        "<@U12345678> ログイン画面でエラーが発生しています"
      );
      assertEquals(
        response.messages?.[1].text,
        "詳細: ユーザーがログインボタンをクリックした後、エラーメッセージが表示されずに画面がフリーズします"
      );

      console.log("✅ テスト成功: スレッドのメッセージが正しく取得されました");
    } finally {
      // テスト後にグローバルfetchを元に戻す
      globalThis.fetch = originalFetch;
    }
  }
);

Deno.test("SlackClient.getThreadReplies should handle API errors", async () => {
  // エラーレスポンスのモック
  const mockErrorResponse = {
    ok: false,
    error: "channel_not_found",
  };

  // グローバルfetchをモックに置き換え
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(mockErrorResponse) as typeof fetch;

  try {
    const client = new SlackClient("xoxb-test-token");
    const result = await client.getThreadReplies(
      "INVALID",
      "1616461034.001000"
    );

    // 結果がエラーであることを確認
    if (result.isOk()) {
      throw new Error("Result should be an error");
    }

    const error = result.error;

    // エラーの検証
    assertEquals(error.type, "API_ERROR");
    assertEquals(error.message, "channel_not_found");

    console.log("✅ テスト成功: APIエラーが正しく処理されました");
  } finally {
    // テスト後にグローバルfetchを元に戻す
    globalThis.fetch = originalFetch;
  }
});

Deno.test(
  "SlackClient.getThreadReplies should validate input parameters",
  async () => {
    const client = new SlackClient("xoxb-test-token");

    // チャンネルIDが空の場合
    let result = await client.getThreadReplies("", "1616461034.001000");

    if (result.isOk()) {
      throw new Error("Result should be an error for empty channel");
    }

    assertEquals(result.error.type, "INVALID_INPUT");

    // スレッドTSが空の場合
    result = await client.getThreadReplies("C12345678", "");

    if (result.isOk()) {
      throw new Error("Result should be an error for empty thread_ts");
    }

    assertEquals(result.error.type, "INVALID_INPUT");

    console.log(
      "✅ テスト成功: 入力パラメータのバリデーションが正しく機能しました"
    );
  }
);
