import { Result } from "npm:neverthrow";

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

export type SlackError = {
  type: "API_ERROR" | "NETWORK_ERROR" | "INVALID_INPUT";
  message: string;
  originalError?: unknown;
};

export interface SlackClientInterface {
  postMessage(
    message: SlackMessage
  ): Promise<Result<SlackResponse, SlackError>>;
}
