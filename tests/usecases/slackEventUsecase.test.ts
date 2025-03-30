import { ok } from "npm:neverthrow";
import {
  SlackEventUsecase,
  SlackEventBody,
} from "../../src/usecases/slackEventUsecase.ts";
import { createSampleThread } from "../utils/messages.ts";
import {
  SlackClientInterface,
  SlackMessage,
  SlackThreadMessage,
  SlackThreadResponse,
} from "../../src/clients/slackClient.ts";

class MockSlackClient implements SlackClientInterface {
  public messages: SlackMessage[] = [];
  private threadMessages: SlackThreadMessage[] = [];

  constructor(threadMessages: SlackThreadMessage[] = []) {
    this.threadMessages = threadMessages;
  }

  async postMessage(message: SlackMessage) {
    this.messages.push(message);
    return ok({ ok: true, ts: Date.now().toString() });
  }

  async getThreadReplies(channel: string, thread_ts: string) {
    return ok({
      ok: true,
      messages: this.threadMessages,
      has_more: false,
    });
  }
}

Deno.test(
  "SlackEventUsecase should retrieve thread messages and respond when receiving a mention",
  async () => {
    // サンプルスレッドを作成
    const sampleThread = createSampleThread();
    const mentionEvent = sampleThread[0];

    // スレッドメッセージをSlackThreadMessage形式に変換
    const threadMessages = sampleThread.map((event) => ({
      ts: event.ts || "",
      text: event.text || "",
      user: "U87654321",
      thread_ts: mentionEvent.ts || "",
    }));

    // モックSlackClientを作成（スレッドメッセージを設定）
    const mockSlackClient = new MockSlackClient(threadMessages);
    const usecase = new SlackEventUsecase(mockSlackClient);

    const eventBody: SlackEventBody = {
      type: "event_callback",
      event: mentionEvent,
    };

    const result = await usecase.exec(eventBody);

    if (!result.isOk()) {
      throw new Error("Result should be successful");
    }

    // スレッドメッセージが取得されていることを確認
    if (
      !result.value.threadMessages ||
      result.value.threadMessages.length !== threadMessages.length
    ) {
      throw new Error(
        `Should have retrieved ${threadMessages.length} thread messages`
      );
    }

    // 応答メッセージが送信されていることを確認
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

    // メッセージの内容を確認
    if (!sentMessage.text.includes(`${threadMessages.length}件のメッセージ`)) {
      throw new Error(
        "Message should mention the number of retrieved messages"
      );
    }

    console.log(
      "✅ テスト成功: メンションに対してスレッドメッセージが取得され、応答メッセージが送信されました"
    );
  }
);
