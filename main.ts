import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Config } from "./src/config/configService.ts";
import { SlackClient } from "./src/clients/slackClient.ts";
import {
  GitHubClient,
  GitHubIssueResponse,
} from "./src/clients/githubClient.ts";
import { DifyClient } from "./src/clients/difyClient.ts";
import { LLMQueryService } from "./src/clients/llmClient.ts";
import {
  HandleSlackMessageUsecase,
  MessageBuilder,
} from "./src/usecases/handleSlackMessageUsecase.ts";

// MessageBuilderの実装
class SimpleMessageBuilder implements MessageBuilder {
  buildRequestForMoreInfo(missingFields: string[]): string {
    return `以下の情報が不足しています。詳細を教えてください：\n${missingFields
      .map((field) => `- ${field}`)
      .join("\n")}`;
  }

  buildIssuePostedMessage(issue: GitHubIssueResponse): string {
    return `GitHubにIssueを作成しました！\n題名: ${issue.title}\nIssue番号: #${issue.number}\nURL: ${issue.html_url}`;
  }
}

serve(async (req) => {
  const configResult = await Config.load();

  if (configResult.isErr()) {
    console.error(`❌ 起動エラー: ${configResult.error.message}`);
    Deno.exit(1);
  }

  const config = configResult.value;

  // 各クライアントの初期化
  const slackClient = new SlackClient(config.slackBotToken);
  const githubClient = new GitHubClient(
    config.githubToken,
    config.githubOwner,
    config.githubRepo
  );
  const difyClient = new DifyClient(
    config.difyApiKey,
    config.difyApplicationId
  );
  const llmQueryService = new LLMQueryService(difyClient);
  const messageBuilder = new SimpleMessageBuilder();

  // HandleSlackMessageUsecaseの初期化
  const handleSlackMessageUsecase = new HandleSlackMessageUsecase(
    githubClient,
    slackClient,
    llmQueryService,
    messageBuilder
  );

  // リクエストの処理
  if (req.method === "POST") {
    try {
      const body = await req.json();

      // Slackのイベントチャレンジに応答
      if (body.type === "url_verification") {
        return new Response(JSON.stringify({ challenge: body.challenge }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Slackのイベントを処理
      if (body.event && body.event.type === "message") {
        const event = body.event;

        // スレッドの親メッセージのみを処理
        if (!event.thread_ts || event.thread_ts === event.ts) {
          // 非同期で処理を実行（レスポンスを待たずに返す）
          handleSlackMessageUsecase
            .execute({
              channel: event.channel,
              ts: event.ts,
            })
            .then((result) => {
              if (result.isErr()) {
                console.error(`❌ エラー: ${result.error.message}`);
              } else if (result.value) {
                console.log(`✅ Issue作成成功: #${result.value.number}`);
              } else {
                console.log("✅ 追加情報リクエスト送信成功");
              }
            });

          // Slackに即時応答
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(`❌ リクエスト処理エラー: ${error.message}`);
      return new Response(
        JSON.stringify({ ok: false, error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // GET リクエストに対するレスポンス
  return new Response("Slack Issue Bot is running", {
    headers: { "Content-Type": "text/plain" },
  });
});
