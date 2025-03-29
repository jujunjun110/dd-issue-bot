import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// 環境変数からSlackトークンを取得
const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN")!;

serve(async (req) => {
  const body = await req.json();

  // URL検証イベント（初回のみSlackが送ってくる）
  if (body.type === "url_verification") {
    return new Response(body.challenge);
  }

  // メンションイベント以外は無視
  const event = body.event;
  if (!event || event.type !== "app_mention") {
    return new Response("Ignored", { status: 200 });
  }

  const message = event.text;
  const channel = event.channel;
  const thread_ts = event.thread_ts || event.ts;

  // メッセージをオウム返し
  const result = await fetch("https://slack.com/api/chat.postMessage", {
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

  const resJson = await result.json();
  if (!resJson.ok) {
    console.error("Slack API error:", resJson);
  }

  return new Response("OK");
});
