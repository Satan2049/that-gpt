import { Buffer } from "node:buffer";
import type { ChatImageAttachment } from "./chat.types.js";

const MAX_IMAGES = 4;
const MAX_BYTES_PER_IMAGE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set<ChatImageAttachment["mimeType"]>([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

function errorWithStatus(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export function validateImages(
  input: Array<{ mimeType: string; base64: string }> | undefined
): ChatImageAttachment[] {
  if (!input?.length) return [];

  if (input.length > MAX_IMAGES) {
    throw errorWithStatus(`At most ${MAX_IMAGES} images per message`, 400);
  }

  const out: ChatImageAttachment[] = [];

  for (const entry of input) {
    if (!ALLOWED_MIME.has(entry.mimeType as ChatImageAttachment["mimeType"])) {
      throw errorWithStatus(
        "Invalid image type. Allowed: image/jpeg, image/png, image/webp",
        400
      );
    }

    const cleaned = entry.base64.replace(/\s+/gu, "");
    if (!cleaned.length) {
      throw errorWithStatus("Empty image payload", 400);
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(cleaned, "base64");
    } catch {
      throw errorWithStatus("Invalid base64 image data", 400);
    }

    if (buffer.length > MAX_BYTES_PER_IMAGE) {
      throw errorWithStatus(`Each image must be at most ${MAX_BYTES_PER_IMAGE / (1024 * 1024)}MB`, 400);
    }

    if (buffer.length === 0) {
      throw errorWithStatus("Decoded image is empty", 400);
    }

    out.push({
      mimeType: entry.mimeType as ChatImageAttachment["mimeType"],
      base64: cleaned
    });
  }

  return out;
}
