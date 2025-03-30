import { Result, ok, err } from "npm:neverthrow";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

export type ConfigError = {
  type: "MISSING_ENV_VAR" | "ENV_LOAD_ERROR";
  message: string;
};

export const ENV_KEYS = {
  IS_DEVELOPING: "IS_DEVELOPING",
  SLACK_BOT_TOKEN: "SLACK_BOT_TOKEN",
};

export class Config {
  private slackBotToken: string;

  constructor(envVars: Record<string, string>) {
    const token = envVars[ENV_KEYS.SLACK_BOT_TOKEN];

    if (!token) {
      throw new Error(
        `Required environment variable ${ENV_KEYS.SLACK_BOT_TOKEN} is missing`
      );
    }

    this.slackBotToken = token;
  }

  getSlackBotToken(): string {
    return this.slackBotToken;
  }

  static async load(): Promise<Result<Config, ConfigError>> {
    try {
      // .envファイルから環境変数を読み込む
      let envVars: Record<string, string> = {};

      try {
        // .envファイルを読み込む
        envVars = await config();
      } catch (loadError) {
        console.log(
          "No .env file found or error loading it, using system environment variables"
        );
      }

      // システムの環境変数をマージ（システム環境変数が優先）
      for (const key of Object.values(ENV_KEYS)) {
        const value = Deno.env.get(key);
        if (value) {
          envVars[key] = value;
        }
      }

      const configInstance = new Config(envVars);
      return ok(configInstance);
    } catch (error) {
      return err({
        type: "MISSING_ENV_VAR",
        message: error.message,
      });
    }
  }
}
