import { Result, ok, err } from "npm:neverthrow";
import { SlackClientInterface } from "../clients/slackClient.ts";
import { GitHubClient, GitHubIssueResponse } from "../clients/githubClient.ts";
import { LLMQueryService } from "../clients/llmClient.ts";
import { DecisionQuery } from "../llmQueries/decisionQuery.ts";
import { FormatMessagesQuery } from "../llmQueries/formatMessagesQuery.ts";

export interface MessageBuilder {
  buildRequestForMoreInfo(missingFields: string[]): string;
  buildIssuePostedMessage(issue: GitHubIssueResponse): string;
}

export type HandleSlackMessageError = {
  type: "SLACK_ERROR" | "GITHUB_ERROR" | "LLM_ERROR";
  message: string;
  originalError?: unknown;
};

export class HandleSlackMessageUsecase {
  constructor(
    private githubClient: GitHubClient,
    private slackClient: SlackClientInterface,
    private llmQueryService: LLMQueryService,
    private messageBuilder: MessageBuilder
  ) {}

  async execute(message: {
    channel: string;
    ts: string;
  }): Promise<Result<GitHubIssueResponse | null, HandleSlackMessageError>> {
    const threadResult = await this.slackClient.getThreadReplies(
      message.channel,
      message.ts
    );

    if (threadResult.isErr()) {
      return err({
        type: "SLACK_ERROR",
        message: "スレッドメッセージの取得に失敗しました",
        originalError: threadResult.error,
      });
    }

    const threadMessages = threadResult.value.messages || [];

    if (threadMessages.length === 0) {
      return err({
        type: "SLACK_ERROR",
        message: "スレッドにメッセージが見つかりませんでした",
      });
    }

    const decisionQuery = new DecisionQuery(threadMessages);
    const decisionResult = await this.llmQueryService.execute(decisionQuery);

    if (decisionResult.isErr()) {
      return err({
        type: "LLM_ERROR",
        message: "情報の判定に失敗しました",
        originalError: decisionResult.error,
      });
    }

    if (!decisionResult.value.isSufficient) {
      const reply = this.messageBuilder.buildRequestForMoreInfo(
        decisionResult.value.missingFields
      );

      const replyResult = await this.slackClient.postMessage({
        channel: message.channel,
        thread_ts: message.ts,
        text: reply,
      });

      if (replyResult.isErr()) {
        return err({
          type: "SLACK_ERROR",
          message: "追加情報リクエストの送信に失敗しました",
          originalError: replyResult.error,
        });
      }

      return ok(null);
    }

    const formatQuery = new FormatMessagesQuery(threadMessages);
    const formatResult = await this.llmQueryService.execute(formatQuery);

    if (formatResult.isErr()) {
      return err({
        type: "LLM_ERROR",
        message: "メッセージのフォーマットに失敗しました",
        originalError: formatResult.error,
      });
    }

    const issueResult = await this.githubClient.postIssue({
      title: formatResult.value.title,
      body: formatResult.value.body,
    });

    if (issueResult.isErr()) {
      return err({
        type: "GITHUB_ERROR",
        message: "GitHub Issueの作成に失敗しました",
        originalError: issueResult.error,
      });
    }

    const replyMessage = this.messageBuilder.buildIssuePostedMessage(
      issueResult.value
    );

    const replyResult = await this.slackClient.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: replyMessage,
    });

    if (replyResult.isErr()) {
      return err({
        type: "SLACK_ERROR",
        message: "Issue作成通知の送信に失敗しました",
        originalError: replyResult.error,
      });
    }

    return ok(issueResult.value);
  }
}
