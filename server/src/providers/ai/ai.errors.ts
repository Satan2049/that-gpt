export type AiErrorCode =
  | "invalid-key"
  | "rate-limit"
  | "timeout"
  | "network"
  | "provider"
  | "unknown";

export class AiClientError extends Error {
  readonly code: AiErrorCode;
  readonly statusCode?: number;

  constructor(message: string, code: AiErrorCode, statusCode?: number) {
    super(message);
    this.name = "AiClientError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function userMessageForAiError(error: AiClientError): string {
  switch (error.code) {
    case "invalid-key":
      return "Invalid API key. Check AI_API_KEY in server/.env.";
    case "rate-limit":
      return "The model provider rate-limited this request. Try again shortly.";
    case "timeout":
      return "The model request timed out. Try again or shorten the conversation.";
    case "network":
      return "Could not reach the model API. Check your network and AI_BASE_URL.";
    case "provider":
      return error.message || "The model provider returned an error.";
    default:
      return error.message || "AI request failed.";
  }
}

export function classifyAiHttpError(status: number, bodyText: string): AiClientError {
  const lower = bodyText.toLowerCase();

  if (status === 401 || status === 403) {
    return new AiClientError(
      "Authentication failed with the model API.",
      "invalid-key",
      status
    );
  }

  if (status === 429) {
    return new AiClientError(
      "Model API rate limit exceeded.",
      "rate-limit",
      status
    );
  }

  if (status === 408 || lower.includes("timeout")) {
    return new AiClientError("Model API request timed out.", "timeout", status);
  }

  if (status >= 500) {
    return new AiClientError(
      bodyText || `Model API error (${status}).`,
      "provider",
      status
    );
  }

  if (lower.includes("invalid api key") || lower.includes("incorrect api key")) {
    return new AiClientError(
      "Invalid API key for the model provider.",
      "invalid-key",
      status
    );
  }

  return new AiClientError(
    bodyText || `Model API returned ${status}.`,
    "provider",
    status
  );
}

export function classifyAiFetchError(error: unknown): AiClientError {
  if (error instanceof AiClientError) return error;

  if (error instanceof Error) {
    const name = error.name;
    const msg = error.message.toLowerCase();
    if (name === "AbortError" || msg.includes("aborted") || msg.includes("timeout")) {
      return new AiClientError("Model API request timed out.", "timeout");
    }
    if (msg.includes("fetch failed") || msg.includes("econnrefused") || msg.includes("enotfound")) {
      return new AiClientError("Could not reach the model API.", "network");
    }
  }

  return new AiClientError(
    error instanceof Error ? error.message : "AI request failed.",
    "unknown"
  );
}
