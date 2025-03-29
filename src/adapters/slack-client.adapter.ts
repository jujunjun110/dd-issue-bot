import { Result, ok, err } from "npm:neverthrow";
import { SlackClientInterface, SlackMessage, SlackResponse, SlackError } from "../interfaces/slack-client.interface.ts";

export class SlackClient implements SlackClientInterface {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async postMessage(message: SlackMessage): Promise<Result<SlackResponse, SlackError>> {
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
}
