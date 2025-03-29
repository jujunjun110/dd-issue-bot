import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN")!;

serve(async (req) => {
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

  // SlackのURL検証（初回だけ来るやつ）
  if (body.type === "url_verification") {
    return new Response(body.challenge);
  }

  const event = body.event;
  if (!event || event.type !== "app_mention") {
    return new Response("Ignored (non-mention)", { status: 200 });
  }

  const message = event.text;
  const channel = event.channel;
  const thread_ts = event.thread_ts || event.ts;

  // Slackへオウム返し
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      thread_ts,
      text: `オウム返し：${message}`,
    }),
  });

  const result = await response.json();
  if (!result.ok) {
    console.error("❌ Slack API error:", result);
  } else {
    console.log("✅ Sent message:", result.ts);
  }

  return new Response("OK");
});
