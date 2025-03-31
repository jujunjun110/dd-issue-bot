import { SlackThreadMessage } from "../clients/slackClient.ts";
import { LLMQuery } from "./llmQuery.ts";

export interface DecisionResult {
  isSufficient: boolean;
  missingFields: string[];
}

export class DecisionQuery implements LLMQuery<DecisionResult> {
  private messages: SlackThreadMessage[];

  constructor(messages: SlackThreadMessage[]) {
    this.messages = messages;
  }

  buildPrompt(): string {
    const messagesText = this.messages
      .map((msg) => `ユーザー ${msg.user}: ${msg.text}`)
      .join("\n\n");

    return `
以下のSlackスレッドの会話を分析し、GitHub Issueとして必要な情報が揃っているか判断してください。

会話内容:
${messagesText}

GitHub Issueとして必要な情報:
1. タイトル（問題の簡潔な説明）
2. 詳細な説明（問題の詳細）
3. 再現手順（問題を再現するための手順）
4. 期待される動作（本来どうあるべきか）
5. 実際の動作（現在どうなっているか）
6. 環境情報（OS、ブラウザ、バージョンなど）

JSON形式で以下の情報を返してください:
{
  "isSufficient": true または false,
  "missingFields": ["不足している情報のフィールド名", ...],
  "analysis": "分析結果の説明"
}
`;
  }

  parseResponse(response: string): DecisionResult {
    try {
      const cleanedResponse = this.extractJsonFromResponse(response);
      const parsedResponse = JSON.parse(cleanedResponse);

      return {
        isSufficient: parsedResponse.isSufficient === true,
        missingFields: Array.isArray(parsedResponse.missingFields)
          ? parsedResponse.missingFields
          : [],
      };
    } catch (_error) {
      return {
        isSufficient: false,
        missingFields: ["解析エラー - LLMの応答を正しく解析できませんでした"],
      };
    }
  }

  private extractJsonFromResponse(response: string): string {
    const jsonRegex = /{[\s\S]*}/;
    const match = response.match(jsonRegex);

    if (match && match[0]) {
      return match[0];
    }

    return '{"isSufficient": false, "missingFields": ["応答形式エラー"]}';
  }
}
