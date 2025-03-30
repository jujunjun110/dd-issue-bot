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

      return ok(new Config(envVars));
    } catch (error) {
      return err({
        type: "MISSING_ENV_VAR",
        message: error.message,
      });
    }
  }
}
