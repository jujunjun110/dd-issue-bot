import { SlackThreadMessage } from "../clients/slackClient.ts";
import { LLMQuery } from "./llmQuery.ts";

export interface FormattedIssue {
  title: string;
  body: string;
}

export class FormatMessagesQuery implements LLMQuery<FormattedIssue> {
  private messages: SlackThreadMessage[];

  constructor(messages: SlackThreadMessage[]) {
    this.messages = messages;
  }

  buildPrompt(): string {
    const messagesText = this.messages
      .map((msg) => `ユーザー ${msg.user}: ${msg.text}`)
      .join("\n\n");

    return `
以下のSlackスレッドの会話を分析し、GitHub Issueの形式にフォーマットしてください。

会話内容:
${messagesText}

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
  }

  parseResponse(response: string): FormattedIssue {
    try {
      const cleanedResponse = this.extractJsonFromResponse(response);
      const parsedResponse = JSON.parse(cleanedResponse);

      return {
        title: parsedResponse.title || "タイトルなし",
        body: parsedResponse.body || "本文なし",
      };
    } catch (_error) {
      return {
        title: "解析エラー",
        body: "LLMの応答を正しく解析できませんでした。",
      };
    }
  }

  private extractJsonFromResponse(response: string): string {
    try {
      const trimmedResponse = response.trim();
      const jsonStart = trimmedResponse.indexOf("{");
      const jsonEnd = trimmedResponse.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        return trimmedResponse.substring(jsonStart, jsonEnd + 1);
      }

      return '{"title": "応答形式エラー", "body": "LLMの応答を正しく解析できませんでした。"}';
    } catch (_error) {
      return '{"title": "応答形式エラー", "body": "LLMの応答を正しく解析できませんでした。"}';
    }
  }
}
