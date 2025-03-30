import { SlackEvent } from "../src/usecases/slack-event.usecase.ts";

/**
 * Factory function to create a test Slack message thread
 * Returns an array of SlackEvent objects representing a thread
 */

// Helper function to create a base SlackEvent
const createSlackEvent = (
  text: string,
  channel: string = "C12345678",
  thread_ts?: string,
  ts: string = Date.now().toString(),
  type: string = "message"
): SlackEvent => ({
  type,
  text,
  channel,
  thread_ts,
  ts,
});

// Helper function to create a mention event
const createMentionEvent = (
  text: string,
  channel: string = "C12345678",
  thread_ts?: string,
  ts: string = Date.now().toString()
): SlackEvent => ({
  type: "app_mention",
  text: `<@U12345678> ${text}`,
  channel,
  thread_ts,
  ts,
});

/**
 * Creates a sample Slack thread with messages
 */
export const createSampleThread = (): SlackEvent[] => {
  const threadTs = Date.now().toString();

  return [
    // Initial mention
    createMentionEvent(
      "ログイン画面でエラーが発生しています",
      "C12345678",
      undefined,
      threadTs
    ),

    // Thread replies
    createSlackEvent(
      "詳細: ユーザーがログインボタンをクリックした後、エラーメッセージが表示されずに画面がフリーズします",
      "C12345678",
      threadTs,
      (Date.now() + 1000).toString()
    ),
    createSlackEvent(
      "再現手順:\n1. ログイン画面にアクセス\n2. メールアドレスとパスワードを入力\n3. ログインボタンをクリック\n4. 画面がフリーズし、何も表示されない",
      "C12345678",
      threadTs,
      (Date.now() + 2000).toString()
    ),
    createSlackEvent(
      "優先度: 高（本番環境で多くのユーザーに影響しています）",
      "C12345678",
      threadTs,
      (Date.now() + 3000).toString()
    ),
  ];
};
