import { Result, ok, err } from "npm:neverthrow";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

export type ConfigError = {
  type: "MISSING_ENV_VAR" | "ENV_LOAD_ERROR";
  message: string;
};

export const ENV_KEYS = {
  IS_DEVELOPING: "IS_DEVELOPING",
  SLACK_BOT_TOKEN: "SLACK_BOT_TOKEN",
  GITHUB_TOKEN: "GITHUB_TOKEN",
  GITHUB_OWNER: "GITHUB_OWNER",
  GITHUB_REPO: "GITHUB_REPO",
  DIFY_API_KEY: "DIFY_API_KEY",
  DIFY_APPLICATION_ID: "DIFY_APPLICATION_ID",
};

export class Config {
  readonly slackBotToken: string;
  readonly githubToken: string;
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly difyApiKey: string;
  readonly difyApplicationId: string;

  constructor(envVars: Record<string, string>) {
    this.slackBotToken = envVars[ENV_KEYS.SLACK_BOT_TOKEN];
    this.githubToken = envVars[ENV_KEYS.GITHUB_TOKEN];
    this.githubOwner = envVars[ENV_KEYS.GITHUB_OWNER];
    this.githubRepo = envVars[ENV_KEYS.GITHUB_REPO];
    this.difyApiKey = envVars[ENV_KEYS.DIFY_API_KEY];
    this.difyApplicationId = envVars[ENV_KEYS.DIFY_APPLICATION_ID];
  }

  private static getSystemEnvVars(): Record<string, string> {
    return Object.values(ENV_KEYS).reduce((acc, key) => {
      const value = Deno.env.get(key);
      return value ? { ...acc, [key]: value } : acc;
    }, {});
  }

  static async load(): Promise<Result<Config, ConfigError>> {
    try {
      const loadDotEnv = async (): Promise<Record<string, string>> => {
        try {
          return await config();
        } catch {
          return {};
        }
      };

      const dotenvVars = await loadDotEnv();
      const isDeveloping = dotenvVars[ENV_KEYS.IS_DEVELOPING] === "true";

      const envVars = isDeveloping ? dotenvVars : this.getSystemEnvVars();

      const requiredEnvVars = [
        ENV_KEYS.SLACK_BOT_TOKEN,
        ENV_KEYS.GITHUB_TOKEN,
        ENV_KEYS.GITHUB_OWNER,
        ENV_KEYS.GITHUB_REPO,
        ENV_KEYS.DIFY_API_KEY,
        ENV_KEYS.DIFY_APPLICATION_ID,
      ];

      const missingEnvVars = requiredEnvVars.filter((key) => !envVars[key]);

      if (missingEnvVars.length > 0) {
        return err({
          type: "MISSING_ENV_VAR",
          message: `Required environment variables are missing: ${missingEnvVars.join(
            ", "
          )}`,
        });
      }

      return ok(new Config(envVars));
    } catch (error) {
      return err({
        type: "ENV_LOAD_ERROR",
        message: error.message,
      });
    }
  }
}
