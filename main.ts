import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SlackClient } from "./src/adapters/slack-client.adapter.ts";
import { SlackEventUsecase } from "./src/usecases/slack-event.usecase.ts";

const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN")!;

// Initialize dependencies
const slackClient = new SlackClient(SLACK_BOT_TOKEN);
const slackEventUsecase = new SlackEventUsecase(slackClient);

serve(async (req) => {
  console.log("💡 Request received:", req.method, req.headers.get("content-type"));

  // Slackのリクエストは基本POST
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

  // Process the event using our usecase
  const resultOrError = await slackEventUsecase.processEvent(body);

  return resultOrError.match(
    // Success case
    (result) => {
      return new Response(result.body, { status: result.status });
    },
    // Error case
    (error) => {
      console.error("❌ Error processing event:", error);
      return new Response(error.message, { status: 500 });
    }
  );
});
