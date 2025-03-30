import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SlackClient } from "./src/clients/slackClient.ts";
import { SlackEventUsecase } from "./src/usecases/slackEventUsecase.ts";
import { Config } from "./src/config/configService.ts";

serve(async (req) => {
  const configResult = await Config.load();

  if (configResult.isErr()) {
    console.error(`❌ 起動エラー: ${configResult.error.message}`);
    Deno.exit(1);
  }

  const config = configResult.value;
  const slackClient = new SlackClient(config.getSlackBotToken());
  const slackEventUsecase = new SlackEventUsecase(slackClient);
  console.log(
    "💡 Request received:",
    req.method,
    req.headers.get("content-type")
  );

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error("❌ Failed to parse JSON:", err);
    return new Response("Bad Request", { status: 400 });
  }

  console.log("📥 Received from Slack:", body);

  const resultOrError = await slackEventUsecase.exec(body);

  if (resultOrError.isErr()) {
    const error = resultOrError.error;
    console.error("❌ Error processing event:", error);
    return new Response(error.message, { status: 500 });
  }

  const result = resultOrError.value;
  return new Response(result.body, { status: result.status });
});
