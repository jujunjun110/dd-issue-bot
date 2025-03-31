# LLMQueryService 設計ドキュメント

## 概要

LLMQueryService は、LLMQuery を処理するためのサービスクラスです。このクラスは、LLMClient インターフェースを注入し、それを利用して LLM に問い合わせを行います。

## クラス構造

### LLMClient インターフェース

```typescript
interface LLMClient {
  post<T>(query: LLMQuery<T>): Promise<Result<T, Error>>;
}
```

LLMClient は、LLM に問い合わせを行うためのインターフェースです。このインターフェースは、LLMQuery を受け取り、LLM に問い合わせを行い、結果を Result でラップして返します。

### LLMQueryService クラス

```typescript
class LLMQueryService {
  constructor(private llmClient: LLMClient) {}

  async execute<T>(query: LLMQuery<T>): Promise<Result<T, Error>> {
    try {
      return await this.llmClient.post(query);
    } catch (error) {
      return Result.err(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
```

LLMQueryService は、LLMClient を注入し、LLMQuery を実行するためのサービスクラスです。execute メソッドは、LLMQuery を受け取り、LLMClient を使用して LLM に問い合わせを行い、結果を返します。

## エラーハンドリング

LLMQueryService は、neverthrow の Result を使用してエラーハンドリングを行います。LLMClient の post メソッドがエラーをスローした場合、それをキャッチして Result でラップして返します。

## 使用例

```typescript
// LLMClientの実装例（Dify API）
class DifyLLMClient implements LLMClient {
  constructor(private apiKey: string, private endpoint: string) {}

  async post<T>(query: LLMQuery<T>): Promise<Result<T, Error>> {
    try {
      const prompt = query.buildPrompt();

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        return Result.err(
          new Error(`API error: ${response.status} ${response.statusText}`)
        );
      }

      const data = await response.json();
      const content = data.response || "";

      try {
        const result = query.parseResponse(content);
        return Result.ok(result);
      } catch (parseError) {
        return Result.err(
          parseError instanceof Error
            ? parseError
            : new Error(`Parse error: ${String(parseError)}`)
        );
      }
    } catch (error) {
      return Result.err(
        error instanceof Error
          ? error
          : new Error(`Network error: ${String(error)}`)
      );
    }
  }
}

// Usecaseでの使用例
class SlackEventUsecase {
  constructor(
    private githubClient: GitHubClient,
    private slackClient: SlackClient,
    private llmQueryService: LLMQueryService,
    private messageBuilder: MessageBuilder
  ) {}

  async execute(
    postMessage: SlackMessage
  ): Promise<Result<GitHubIssue, Error>> {
    const threadMessagesResult = await this.slackClient.getThreadMessages(
      postMessage.ts
    );

    if (threadMessagesResult.isErr()) {
      return Result.err(threadMessagesResult.error);
    }

    const threadMessages = threadMessagesResult.value;

    // 情報が十分か判定するLLMQuery
    const decisionQuery = new DecisionQuery(threadMessages);
    const decisionResult = await this.llmQueryService.execute(decisionQuery);

    if (decisionResult.isErr()) {
      return Result.err(decisionResult.error);
    }

    if (!decisionResult.value.isSufficient) {
      const reply = this.messageBuilder.buildRequestForMoreInfo(
        decisionResult.value.missingFields
      );
      const replyResult = await this.slackClient.replyInThread(
        postMessage.ts,
        reply
      );

      if (replyResult.isErr()) {
        return Result.err(replyResult.error);
      }

      return Result.err(new Error("情報不足"));
    }

    // 問題なければ要約してGitHub Issueを作成
    const formatQuery = new FormatMessagesQuery(threadMessages);
    const formatResult = await this.llmQueryService.execute(formatQuery);

    if (formatResult.isErr()) {
      return Result.err(formatResult.error);
    }

    return this.githubClient.createIssue(formatResult.value);
  }
}
```

## テスト戦略

LLMQueryService のテストでは、モック LLMClient を使用して、以下のケースをテストします：

1. 成功ケース：LLMClient が成功した場合、LLMQueryService は正しく結果を返すこと
2. 失敗ケース：LLMClient が失敗した場合、LLMQueryService は適切にエラーを返すこと
3. 例外ケース：LLMClient が例外をスローした場合、LLMQueryService は適切にエラーをキャッチして Result でラップすること

```typescript
// テスト用のモックLLMQuery
class MockLLMQuery implements LLMQuery<string> {
  buildPrompt(): string {
    return "テストプロンプト";
  }

  parseResponse(response: string): string {
    return response;
  }
}

// テスト用のモックLLMClient
class MockLLMClient implements LLMClient {
  constructor(private shouldSucceed: boolean, private response: string) {}

  async post<T>(query: LLMQuery<T>): Promise<Result<T, Error>> {
    if (this.shouldSucceed) {
      const result = query.parseResponse(this.response);
      return Result.ok(result);
    } else {
      return Result.err(new Error("テストエラー"));
    }
  }
}

// テスト例
Deno.test("LLMQueryService - 成功ケース", async () => {
  const mockClient = new MockLLMClient(true, "テスト成功");
  const service = new LLMQueryService(mockClient);
  const query = new MockLLMQuery();

  const result = await service.execute(query);

  assertEquals(result.isOk(), true);
  if (result.isOk()) {
    assertEquals(result.value, "テスト成功");
  }
});
```

## 設計の利点

1. **依存性注入**：LLMClient をコンストラクタで注入することで、テスト容易性を確保しています。
2. **単一責任の原則**：LLMQueryService は LLMQuery の実行のみを担当し、LLMClient は LLM との通信のみを担当しています。
3. **エラーハンドリング**：neverthrow の Result を使用して、エラーハンドリングを明示的に行っています。
4. **型安全性**：ジェネリック型を使用して、様々な種類の LLMQuery と結果型に対応しています。
