import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.220.1/assert/mod.ts";
import {
  DecisionQuery,
  DecisionResult,
} from "../../src/llmQueries/decisionQuery.ts";
import { SlackThreadMessage } from "../../src/clients/slackClient.ts";

Deno.test(
  "DecisionQuery.buildPrompt should generate correct prompt format",
  () => {
    const messages: SlackThreadMessage[] = [
      {
        ts: "1616461034.001000",
        text: "ログイン画面でエラーが発生しています",
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
    ];

    const query = new DecisionQuery(messages);
    const prompt = query.buildPrompt();

    assertStringIncludes(prompt, "以下のSlackスレッドの会話を分析し");
    assertStringIncludes(prompt, "GitHub Issueとして必要な情報");
    assertStringIncludes(prompt, "会話内容:");
    assertStringIncludes(
      prompt,
      "ユーザー U87654321: ログイン画面でエラーが発生しています"
    );
    assertStringIncludes(
      prompt,
      "ユーザー U87654321: 詳細: ユーザーがログインボタンをクリックした後"
    );
    assertStringIncludes(prompt, "ユーザー U87654321: 再現手順:");
    assertStringIncludes(prompt, "JSON形式で以下の情報を返してください");
    assertStringIncludes(prompt, '"isSufficient": true または false');
    assertStringIncludes(
      prompt,
      '"missingFields": ["不足している情報のフィールド名", ...]'
    );
  }
);

Deno.test(
  "DecisionQuery.buildPrompt should handle different users correctly",
  () => {
    const messages: SlackThreadMessage[] = [
      {
        ts: "1616461034.001000",
        text: "ログイン画面でエラーが発生しています",
        user: "U87654321",
        thread_ts: "1616461034.001000",
      },
      {
        ts: "1616461044.001100",
        text: "どのような環境で発生していますか？",
        user: "U12345678",
        thread_ts: "1616461034.001000",
      },
      {
        ts: "1616461054.001200",
        text: "Chrome 最新版、Windows 11で発生しています",
        user: "U87654321",
        thread_ts: "1616461034.001000",
      },
    ];

    const query = new DecisionQuery(messages);
    const prompt = query.buildPrompt();

    assertStringIncludes(
      prompt,
      "ユーザー U87654321: ログイン画面でエラーが発生しています"
    );
    assertStringIncludes(
      prompt,
      "ユーザー U12345678: どのような環境で発生していますか？"
    );
    assertStringIncludes(
      prompt,
      "ユーザー U87654321: Chrome 最新版、Windows 11で発生しています"
    );
  }
);

Deno.test(
  "DecisionQuery.buildPrompt should handle empty messages array",
  () => {
    const messages: SlackThreadMessage[] = [];
    const query = new DecisionQuery(messages);
    const prompt = query.buildPrompt();

    assertStringIncludes(prompt, "以下のSlackスレッドの会話を分析し");
    assertStringIncludes(prompt, "会話内容:");
    assertEquals(
      prompt.includes("ユーザー"),
      false,
      "空のメッセージ配列の場合、ユーザーメッセージが含まれるべきではない"
    );
  }
);

Deno.test(
  "DecisionQuery.buildPrompt should include all required GitHub Issue fields",
  () => {
    const messages: SlackThreadMessage[] = [
      {
        ts: "1616461034.001000",
        text: "テストメッセージ",
        user: "U87654321",
        thread_ts: "1616461034.001000",
      },
    ];

    const query = new DecisionQuery(messages);
    const prompt = query.buildPrompt();

    const requiredFields = [
      "タイトル（問題の簡潔な説明）",
      "詳細な説明（問題の詳細）",
      "再現手順（問題を再現するための手順）",
      "期待される動作（本来どうあるべきか）",
      "実際の動作（現在どうなっているか）",
      "環境情報（OS、ブラウザ、バージョンなど）",
    ];

    for (const field of requiredFields) {
      assertStringIncludes(
        prompt,
        field,
        `プロンプトには "${field}" が含まれるべき`
      );
    }
  }
);

Deno.test(
  "DecisionQuery.parseResponse should parse valid JSON response",
  () => {
    const query = new DecisionQuery([]);
    const response = `
  {
    "isSufficient": true,
    "missingFields": [],
    "analysis": "すべての必要情報が揃っています。"
  }
  `;

    const result = query.parseResponse(response);

    assertEquals(result.isSufficient, true);
    assertEquals(result.missingFields.length, 0);
  }
);

Deno.test(
  "DecisionQuery.parseResponse should handle invalid JSON format",
  () => {
    const query = new DecisionQuery([]);
    const response = `
  解析結果:
  必要な情報は揃っています。
  `;

    const result = query.parseResponse(response);

    assertEquals(result.isSufficient, false);
    assertEquals(result.missingFields.length, 1);
    assertEquals(result.missingFields[0], "応答形式エラー");
  }
);

Deno.test(
  "DecisionQuery.parseResponse should handle JSON with missing fields",
  () => {
    const query = new DecisionQuery([]);
    const response = `
  {
    "isSufficient": false,
    "missingFields": ["タイトル", "再現手順", "環境情報"],
    "analysis": "いくつかの情報が不足しています。"
  }
  `;

    const result = query.parseResponse(response);

    assertEquals(result.isSufficient, false);
    assertEquals(result.missingFields.length, 3);
    assertEquals(result.missingFields[0], "タイトル");
    assertEquals(result.missingFields[1], "再現手順");
    assertEquals(result.missingFields[2], "環境情報");
  }
);

Deno.test(
  "DecisionQuery.parseResponse should extract JSON from text with surrounding content",
  () => {
    const query = new DecisionQuery([]);
    const response = `
  Slackスレッドの分析結果:

  {
    "isSufficient": true,
    "missingFields": [],
    "analysis": "すべての必要情報が揃っています。"
  }

  以上が分析結果です。
  `;

    const result = query.parseResponse(response);

    assertEquals(result.isSufficient, true);
    assertEquals(result.missingFields.length, 0);
  }
);
