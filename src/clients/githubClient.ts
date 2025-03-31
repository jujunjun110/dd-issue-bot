import { Result, ok, err } from "npm:neverthrow";

export type GitHubIssue = {
  title: string;
  body: string;
  labels?: string[];
};

export type GitHubIssueResponse = {
  id: number;
  number: number;
  title: string;
  html_url: string;
};

export type GitHubError = {
  type: "API_ERROR" | "NETWORK_ERROR" | "INVALID_INPUT";
  message: string;
  originalError?: unknown;
};

export class GitHubClient {
  private token: string;
  private owner: string;
  private repo: string;
  private baseUrl: string;

  constructor(token: string, owner: string, repo: string) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.baseUrl = "https://api.github.com";
  }

  async postIssue(
    issue: GitHubIssue
  ): Promise<Result<GitHubIssueResponse, GitHubError>> {
    if (!issue.title || !issue.body) {
      return err({
        type: "INVALID_INPUT",
        message: "Issue title and body are required",
      });
    }

    try {
      const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/issues`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify(issue),
      });

      if (!response.ok) {
        return err({
          type: "API_ERROR",
          message: `HTTP error: ${response.status} ${response.statusText}`,
        });
      }

      const data = await response.json();

      const issueResponse: GitHubIssueResponse = {
        id: data.id,
        number: data.number,
        title: data.title,
        html_url: data.html_url,
      };

      return ok(issueResponse);
    } catch (error) {
      return err({
        type: "NETWORK_ERROR",
        message: "Failed to communicate with GitHub API",
        originalError: error,
      });
    }
  }
}
