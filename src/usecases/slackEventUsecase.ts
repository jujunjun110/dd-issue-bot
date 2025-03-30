import { Result, ok, err } from "npm:neverthrow";
import { SlackClientInterface, SlackError } from "../../clients/slackClient.ts";

export interface SlackEvent {
  type: string;
  text?: string;
  channel?: string;
  thread_ts?: string;
  ts?: string;
}

export interface SlackEventBody {
  type: string;
  challenge?: string;
  event?: SlackEvent;
}

export type EventError =
  | SlackError
  | {
      type: "INVALID_EVENT";
      message: string;
    };

export type EventResult = {
  status: number;
  body?: string;
};

export class SlackEventUsecase {
  constructor(private slackClient: SlackClientInterface) {}

  async exec(body: SlackEventBody): Promise<Result<EventResult, EventError>> {
    if (body.type === "url_verification") {
      if (!body.challenge) {
        return err({
          type: "INVALID_INPUT",
          message: "Challenge token missing in URL verification request",
        });
      }

      return ok({
        status: 200,
        body: body.challenge,
      });
    }

    const event = body.event;
    if (!event || event.type !== "app_mention") {
      return ok({
        status: 200,
        body: "Ignored (non-mention)",
      });
    }

    if (!event.text || !event.channel) {
      return err({
        type: "INVALID_EVENT",
        message: "Invalid event data: missing text or channel",
      });
    }

    const message = event.text;
    const channel = event.channel;
    const thread_ts = event.thread_ts || event.ts || "";

    const result = await this.slackClient.postMessage({
      channel,
      thread_ts,
      text: `オウム返し：${message}`,
    });

    return result
      .map((response) => {
        console.log("✅ Sent message:", response.ts);
        return {
          status: 200,
          body: "OK",
        };
      })
      .mapErr((error) => {
        console.error("❌ Slack API error:", error);
        return error;
      });
  }
}
