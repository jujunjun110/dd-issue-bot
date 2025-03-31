import { Result, ok, err } from "npm:neverthrow";
import {
  SlackClientInterface,
  SlackError,
  SlackThreadMessage,
} from "../clients/slackClient.ts";

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
  threadMessages?: SlackThreadMessage[];
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

    const _message = event.text;
    const channel = event.channel;
    const thread_ts = event.thread_ts || event.ts || "";

    // スレッドの全メッセージを取得
    const threadResult = await this.getThreadMessages(channel, thread_ts);
    if (threadResult.isErr()) {
      return err(threadResult.error);
    }

    const threadMessages = threadResult.value;

    // デバッグ用にスレッドメッセージを出力
    console.log(`✅ Retrieved ${threadMessages.length} messages from thread`);

    // 応答メッセージを送信
    const result = await this.slackClient.postMessage({
      channel,
      thread_ts,
      text: `スレッドから${threadMessages.length}件のメッセージを取得しました。`,
    });

    return result
      .map((response) => {
        console.log("✅ Sent message:", response.ts);
        return {
          status: 200,
          body: "OK",
          threadMessages,
        };
      })
      .mapErr((error) => {
        console.error("❌ Slack API error:", error);
        return error;
      });
  }

  /**
   * スレッドの全メッセージを取得する
   */
  private async getThreadMessages(
    channel: string,
    thread_ts: string
  ): Promise<Result<SlackThreadMessage[], SlackError>> {
    const result = await this.slackClient.getThreadReplies(channel, thread_ts);

    return result.map((response) => {
      if (!response.messages) {
        return [];
      }
      return response.messages;
    });
  }
}
