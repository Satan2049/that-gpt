import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3001),
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiBaseUrl: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
  aiModel: process.env.AI_MODEL ?? "gpt-4o-mini",
  aiDefaultSystemPrompt: process.env.AI_DEFAULT_SYSTEM_PROMPT ?? "",
  aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 60_000),
  aiMaxRetries: Number(process.env.AI_MAX_RETRIES ?? 2)
};
