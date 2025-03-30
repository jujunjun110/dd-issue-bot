import { Result, ok, err } from "npm:neverthrow";

// インターフェース定義
export interface SlackMessage {
  channel: string;
  thread_ts: string;
  text: string;
}

export interface SlackResponse {
  ok: boolean;
  ts?: string;
  error?: string;
}

export interface SlackThreadMessage {
  ts: string;
  text: string;
  user: string;
  thread_ts: string;
}

export interface SlackThreadResponse extends SlackResponse {
  messages?: SlackThreadMessage[];
  has_more?: boolean;
}

export type SlackError = {
  type: "API_ERROR" | "NETWORK_ERROR" | "INVALID_INPUT";
  message: string;
  originalError?: unknown;
};

export interface SlackClientInterface {
  postMessage(
    message: SlackMessage
  ): Promise<Result<SlackResponse, SlackError>>;

  getThreadReplies(
    channel: string,
    thread_ts: string
  ): Promise<Result<SlackThreadResponse, SlackError>>;
}

// クライアント実装
export class SlackClient implements SlackClientInterface {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async postMessage(
    message: SlackMessage
  ): Promise<Result<SlackResponse, SlackError>> {
    try {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        return err({
          type: "API_ERROR",
          message: `HTTP error: ${response.status} ${response.statusText}`,
        });
      }

      const result: SlackResponse = await response.json();

      if (!result.ok) {
        return err({
          type: "API_ERROR",
          message: result.error || "Unknown Slack API error",
        });
      }

      return ok(result);
    } catch (error) {
      return err({
        type: "NETWORK_ERROR",
        message: "Failed to communicate with Slack API",
        originalError: error,
      });
    }
  }

  async getThreadReplies(
    channel: string,
    thread_ts: string
  ): Promise<Result<SlackThreadResponse, SlackError>> {
    if (!channel || !thread_ts) {
      return err({
        type: "INVALID_INPUT",
        message: "Channel and thread_ts are required",
      });
    }

    try {
      const url = new URL("https://slack.com/api/conversations.replies");
      url.searchParams.append("channel", channel);
      url.searchParams.append("ts", thread_ts);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!response.ok) {
        return err({
          type: "API_ERROR",
          message: `HTTP error: ${response.status} ${response.statusText}`,
        });
      }

      const result: SlackThreadResponse = await response.json();

      if (!result.ok) {
        return err({
          type: "API_ERROR",
          message: result.error || "Unknown Slack API error",
        });
      }

      return ok(result);
    } catch (error) {
      return err({
        type: "NETWORK_ERROR",
        message: "Failed to communicate with Slack API",
        originalError: error,
      });
    }
  }
}
