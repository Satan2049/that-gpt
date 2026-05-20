import { env } from "../../config/env.js";
import {
  AiClientError,
  classifyAiFetchError,
  classifyAiHttpError
} from "./ai.errors.js";
import type { ChatCompletionMessage } from "./ai.types.js";

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseCompletionContent(res: Response): Promise<string> {
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new AiClientError("Invalid AI response shape.", "provider", res.status);
  }
  return content;
}

export async function createChatCompletion(params: {
  messages: ChatCompletionMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  if (!env.aiApiKey.trim()) {
    throw new AiClientError("AI_API_KEY is not configured.", "invalid-key");
  }

  const baseUrl = env.aiBaseUrl.replace(/\/$/u, "");
  const maxAttempts = Math.max(1, env.aiMaxRetries + 1);
  let lastError: AiClientError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      const backoffMs = Math.min(8000, 500 * 2 ** (attempt - 1));
      await sleep(backoffMs);
    }

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.aiApiKey}`
        },
        body: JSON.stringify({
          model: params.model ?? env.aiModel,
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2048
        }),
        signal: AbortSignal.timeout(env.aiRequestTimeoutMs)
      });

      if (!res.ok) {
        const text = await res.text();
        const err = classifyAiHttpError(res.status, text);
        if (RETRYABLE_STATUS.has(res.status) && attempt < maxAttempts - 1) {
          lastError = err;
          continue;
        }
        throw err;
      }

      return await parseCompletionContent(res);
    } catch (error) {
      const classified = classifyAiFetchError(error);
      const retryable =
        classified.code === "rate-limit" ||
        classified.code === "timeout" ||
        classified.code === "network" ||
        (classified.statusCode !== undefined && RETRYABLE_STATUS.has(classified.statusCode));

      if (retryable && attempt < maxAttempts - 1) {
        lastError = classified;
        continue;
      }
      throw classified;
    }
  }

  throw lastError ?? new AiClientError("AI request failed.", "unknown");
}
