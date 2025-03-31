import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Result, ok, err } from "npm:neverthrow";
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

type RequestError = {
  type: "JSON_PARSE_ERROR" | "INTERNAL_SERVER_ERROR";
  message: string;
  originalError?: unknown;
};

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

  const handleSlackMessageUsecase = new HandleSlackMessageUsecase(
    githubClient,
    slackClient,
    llmQueryService,
    messageBuilder
  );

  if (req.method !== "POST") {
    return new Response("Slack Issue Bot is running", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const parseRequestBody = async (
    request: Request
  ): Promise<Result<any, RequestError>> => {
    try {
      const body = await request.json();
      return ok(body);
    } catch (error) {
      return err({
        type: "JSON_PARSE_ERROR",
        message: "リクエストボディのJSONパースに失敗しました",
        originalError: error,
      });
    }
  };

  const bodyResult = await parseRequestBody(req);

  if (bodyResult.isErr()) {
    console.error(`❌ リクエスト処理エラー: ${bodyResult.error.message}`);
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = bodyResult.value;

  if (body.type === "url_verification") {
    return new Response(JSON.stringify({ challenge: body.challenge }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.event || body.event.type !== "message") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = body.event;

  if (event.thread_ts && event.thread_ts !== event.ts) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await handleSlackMessageUsecase.execute({
    channel: event.channel,
    ts: event.ts,
  });

  if (result.isErr()) {
    console.error(`❌ エラー: ${result.error.message}`);
    return new Response(
      JSON.stringify({ ok: false, error: result.error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (result.value) {
    console.log(`✅ Issue作成成功: #${result.value.number}`);
    return new Response(
      JSON.stringify({
        ok: true,
        message: `Issue #${result.value.number} created successfully`,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  console.log("✅ 追加情報リクエスト送信成功");
  return new Response(
    JSON.stringify({ ok: true, message: "Additional information requested" }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
