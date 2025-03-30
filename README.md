# 仕様
- メンションがあったら起動
- そのスレッドのメッセージをすべて読み込む
- そのメッセージの内容をまとめてDifyに問い合わせ
- GitHub Issueとして必要な要素がすべて揃っているか判定
 - 揃っていなかったら、スレッドに返信し追加情報を集める（終了）
- 揃っていたら、Difyに再度問い合わせ文言などを調整
- その後、GitHub Issueを作成ohx

# メイン処理(UseCase)の擬似コード

constructorで注入するもの
- githubClient
- slackClient
- llmClient // LLMQuery<T> を受け取れる
- messageBuilder

exec(postMessage) {
  const threadMessages = slackClient.getThreadMessages(postMessage.ts)

  // 情報が十分か判定する LLMQuery
  const decisionQuery = new DecisionQuery(threadMessages)
  const decisionResult = await llmClient.post(decisionQuery)

  if (decisionResult.isErr()) {
    // ここではログ出力などにとどめる（擬似コードなので詳細は省略）
    return
  }

  if (!decisionResult.value.isSufficient) {
    const reply = messageBuilder.buildRequestForMoreInfo(decisionResult.value.missingFields)
    slackClient.replyInThread(postMessage.ts, reply)
    return
  }

  // 問題なければ要約してGitHub Issueを作成
  const summaryQuery = new SummaryQuery(threadMessages)
  const summaryResult = await llmClient.post(summaryQuery)

  if (summaryResult.isErr()) {
    return
  }

  const issue = githubClient.post(summaryResult.value)
  const replyMessage = messageBuilder.buildIssuePostedMessage(issue)
  slackClient.send(replyMessage)

  return issue
}