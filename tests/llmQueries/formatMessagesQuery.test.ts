import { assertEquals } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { FormatMessagesQuery } from "../../src/llmQueries/formatMessagesQuery.ts";
import { SlackThreadMessage } from "../../src/clients/slackClient.ts";

Deno.test(
  "FormatMessagesQuery.buildPrompt should generate correct prompt format",
  () => {
    const messages: SlackThreadMessage[] = [
      {
        ts: "1616461034.001000",
        text: "困ったことを見つけたな。",
        user: "U87654321",
        thread_ts: "1616461034.001000",
      },
      {
        ts: "1616461044.001100",
        text: "一覧画面で表示されているグラフの色と、テキストの色が異なっている",
        user: "U87654321",
        thread_ts: "1616461034.001000",
      },
      {
        ts: "1616461044.001100",
        text: "報告ありがとう！それが実現されないとどのようなことが困りますか？",
        user: "U12345678",
        thread_ts: "1616461034.001000",
      },
      {
        ts: "1616461044.001100",
        text: "ユーザーがデータを見るときに、混乱してしまう。",
        user: "U87654321",
        thread_ts: "1616461034.001000",
      },
    ];

    const query = new FormatMessagesQuery(messages);
    const prompt = query.buildPrompt();

    const expectedPrompt = `
以下のSlackスレッドの会話を分析し、GitHub Issueの形式にフォーマットしてください。

会話内容:
ユーザー U87654321: 困ったことを見つけたな。

ユーザー U87654321: 一覧画面で表示されているグラフの色と、テキストの色が異なっている

ユーザー U12345678: 報告ありがとう！それが実現されないとどのようなことが困りますか？

ユーザー U87654321: ユーザーがデータを見るときに、混乱してしまう。

以下の情報を含むGitHub Issueを作成してください:
1. タイトル（問題の簡潔な説明）
2. 詳細な説明（問題の詳細）
3. 再現手順（問題を再現するための手順）
4. 期待される動作（本来どうあるべきか）
5. 実際の動作（現在どうなっているか）
6. 環境情報（OS、ブラウザ、バージョンなど）

会話から抽出できない情報がある場合は、その部分は「情報なし」と記載してください。

JSON形式で以下の情報を返してください:
{
  "title": "Issueのタイトル",
  "body": "Issueの本文（Markdownフォーマット）"
}
`;

    assertEquals(prompt.trim(), expectedPrompt.trim());
  }
);

Deno.test(
  "FormatMessagesQuery.parseResponse should correctly parse JSON response",
  () => {
    const query = new FormatMessagesQuery([]);
    const response = `
  {
    "title": "グラフとテキストの色が一致していない",
    "body": "## 詳細な説明\\nダッシュボードの一覧画面において、グラフの色とそれに対応するテキストの色が一致していません。\\n\\n## 再現手順\\n1. ダッシュボード画面を開く\\n2. 一覧表示に切り替える\\n3. グラフとテキストの色を確認する\\n\\n## 期待される動作\\nグラフの色とテキストの色が一致している\\n\\n## 実際の動作\\nグラフの色とテキストの色が異なっている\\n\\n## 環境情報\\n情報なし"
  }
  `;

    const result = query.parseResponse(response);

    assertEquals(result.title, "グラフとテキストの色が一致していない");
    assertEquals(
      result.body.includes("ダッシュボードの一覧画面において"),
      true
    );
    assertEquals(result.body.includes("## 再現手順"), true);
  }
);

Deno.test(
  "FormatMessagesQuery.parseResponse should handle invalid JSON response",
  () => {
    const query = new FormatMessagesQuery([]);
    const response = `これは無効なJSONレスポンスです`;

    const result = query.parseResponse(response);

    assertEquals(result.title, "応答形式エラー");
    assertEquals(result.body, "LLMの応答を正しく解析できませんでした。");
  }
);
