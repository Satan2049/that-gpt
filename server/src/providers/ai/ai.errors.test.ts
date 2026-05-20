import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AiClientError,
  classifyAiHttpError,
  userMessageForAiError
} from "./ai.errors.js";

describe("ai.errors", () => {
  it("maps 401 to invalid-key", () => {
    const err = classifyAiHttpError(401, "Unauthorized");
    assert.equal(err.code, "invalid-key");
    assert.equal(err.statusCode, 401);
  });

  it("maps 429 to rate-limit", () => {
    const err = classifyAiHttpError(429, "Too Many Requests");
    assert.equal(err.code, "rate-limit");
  });

  it("returns friendly user messages", () => {
    const err = new AiClientError("raw", "timeout");
    assert.match(userMessageForAiError(err), /timed out/i);
  });
});
