import { ok } from "npm:neverthrow";
import {
  SlackEventUsecase,
  SlackEventBody,
} from "../../src/usecases/slackEventUsecase.ts";
import { createSampleThread } from "../utils/messages.ts";
import {
  SlackClientInterface,
  SlackMessage,
} from "../../src/clients/slackClient.ts";

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
    const mockSlackClient = new MockSlackClient();
    const usecase = new SlackEventUsecase(mockSlackClient);

    const sampleThread = createSampleThread();
    const mentionEvent = sampleThread[0];

    const eventBody: SlackEventBody = {
      type: "event_callback",
      event: mentionEvent,
    };

    const result = await usecase.exec(eventBody);

    if (!result.isOk()) {
      throw new Error("Result should be successful");
    }

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

    if (sentMessage.text !== `オウム返し：${mentionEvent.text}`) {
      throw new Error("Message should have the correct echo format");
    }

    console.log(
      "✅ テスト成功: メンションに対して正しくオウム返しメッセージが送信されました"
    );
  }
);
