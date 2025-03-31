import { assertEquals } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { GitHubClient, GitHubIssue } from "../../src/clients/githubClient.ts";

const createMockFetch = (
  status: number,
  responseData: Record<string, unknown>
) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = () => {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: () => Promise.resolve(responseData),
    } as Response);
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
};

Deno.test("GitHubClient - postIssue - success", async () => {
  const mockResponse = {
    id: 1,
    number: 101,
    title: "Test Issue",
    html_url: "https://github.com/owner/repo/issues/101",
  };

  const restoreFetch = createMockFetch(201, mockResponse);

  try {
    const client = new GitHubClient("test-token", "owner", "repo");
    const issue: GitHubIssue = {
      title: "Test Issue",
      body: "This is a test issue",
      labels: ["bug", "test"],
    };

    const result = await client.postIssue(issue);

    assertEquals(result.isOk(), true);

    if (result.isOk()) {
      const data = result.value;
      assertEquals(data.id, 1);
      assertEquals(data.number, 101);
      assertEquals(data.title, "Test Issue");
      assertEquals(data.html_url, "https://github.com/owner/repo/issues/101");
    }
  } finally {
    restoreFetch();
  }
});

Deno.test("GitHubClient - postIssue - invalid input", async () => {
  const client = new GitHubClient("test-token", "owner", "repo");

  const emptyTitleIssue: GitHubIssue = {
    title: "",
    body: "This is a test issue",
  };

  const result = await client.postIssue(emptyTitleIssue);

  assertEquals(result.isErr(), true);

  if (result.isErr()) {
    const error = result.error;
    assertEquals(error.type, "INVALID_INPUT");
    assertEquals(error.message, "Issue title and body are required");
  }
});

Deno.test("GitHubClient - postIssue - API error", async () => {
  const mockResponse = {
    message: "Validation Failed",
    errors: [{ resource: "Issue", field: "title", code: "missing_field" }],
  };

  const restoreFetch = createMockFetch(422, mockResponse);

  try {
    const client = new GitHubClient("test-token", "owner", "repo");
    const issue: GitHubIssue = {
      title: "Test Issue",
      body: "This is a test issue",
    };

    const result = await client.postIssue(issue);

    assertEquals(result.isErr(), true);

    if (result.isErr()) {
      const error = result.error;
      assertEquals(error.type, "API_ERROR");
      assertEquals(error.message.startsWith("HTTP error: 422"), true);
    }
  } finally {
    restoreFetch();
  }
});

Deno.test("GitHubClient - postIssue - network error", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = () => {
    return Promise.reject(new Error("Network error"));
  };

  try {
    const client = new GitHubClient("test-token", "owner", "repo");
    const issue: GitHubIssue = {
      title: "Test Issue",
      body: "This is a test issue",
    };

    const result = await client.postIssue(issue);

    assertEquals(result.isErr(), true);

    if (result.isErr()) {
      const error = result.error;
      assertEquals(error.type, "NETWORK_ERROR");
      assertEquals(error.message, "Failed to communicate with GitHub API");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
