import { ok } from "npm:neverthrow";
import {
  SlackEventUsecase,
  SlackEventBody,
} from "../src/usecases/slack-event.usecase.ts";
import {
  SlackClientInterface,
  SlackMessage,
} from "../src/interfaces/slack-client.interface.ts";
import { createSampleThread } from "./messages.ts";

// Mock implementation of SlackClientInterface
class MockSlackClient implements SlackClientInterface {
  public messages: SlackMessage[] = [];

  async postMessage(message: SlackMessage) {
    this.messages.push(message);
    return ok({ ok: true, ts: Date.now().toString() });
  }
}

Deno.test(
  "SlackEventUsecase should respond with echo message when receiving a mention",
  async () => {
    // Setup
    const mockSlackClient = new MockSlackClient();
    const usecase = new SlackEventUsecase(mockSlackClient);

    // Get the first message (mention) from our sample thread
    const sampleThread = createSampleThread();
    const mentionEvent = sampleThread[0];

    // Create the event body
    const eventBody: SlackEventBody = {
      type: "event_callback",
      event: mentionEvent,
    };

    // Execute the usecase
    const result = await usecase.exec(eventBody);

    // Verify the result is successful
    if (!result.isOk()) {
      throw new Error("Result should be successful");
    }

    // Verify the slack client was called with the correct message
    if (mockSlackClient.messages.length !== 1) {
      throw new Error("Should have sent exactly one message");
    }

    const sentMessage = mockSlackClient.messages[0];
    if (sentMessage.channel !== mentionEvent.channel) {
      throw new Error("Message should be sent to the correct channel");
    }

    if (sentMessage.thread_ts !== mentionEvent.ts) {
      throw new Error("Message should be in the correct thread");
    }

    // Verify the echo message format
    if (sentMessage.text !== `オウム返し：${mentionEvent.text}`) {
      throw new Error("Message should have the correct echo format");
    }

    console.log(
      "✅ テスト成功: メンションに対して正しくオウム返しメッセージが送信されました"
    );
  }
);
