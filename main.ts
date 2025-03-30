import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SlackClient } from "./src/adapters/slackClientAdapter.ts";
import { SlackEventUsecase } from "./src/usecases/slackEventUsecase.ts";

const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN")!;

const slackClient = new SlackClient(SLACK_BOT_TOKEN);
const slackEventUsecase = new SlackEventUsecase(slackClient);

serve(async (req) => {
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

  return resultOrError.match(
    (result) => {
      return new Response(result.body, { status: result.status });
    },
    (error) => {
      console.error("❌ Error processing event:", error);
      return new Response(error.message, { status: 500 });
    }
  );
});
