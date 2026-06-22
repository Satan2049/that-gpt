export const MAX_ATTACHMENTS_PER_MESSAGE = 4;
export const MAX_BINARY_BYTES = 5 * 1024 * 1024;
export const MAX_TEXT_BYTES = 512 * 1024;

export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
] as const;

export const ALLOWED_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a"
] as const;

export const ALLOWED_PDF_MIMES = ["application/pdf"] as const;

export const ALLOWED_DOCX_MIMES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

export const ALLOWED_TEXT_MIMES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/json",
  "application/xml",
  "text/xml"
] as const;

export const ALLOWED_ATTACHMENT_MIMES = [
  ...ALLOWED_IMAGE_MIMES,
  ...ALLOWED_AUDIO_MIMES,
  ...ALLOWED_TEXT_MIMES,
  ...ALLOWED_PDF_MIMES,
  ...ALLOWED_DOCX_MIMES
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];
export type AllowedAttachmentMime = (typeof ALLOWED_ATTACHMENT_MIMES)[number];

export function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime);
}

export function isAllowedAttachmentMime(mime: string): boolean {
  if ((ALLOWED_ATTACHMENT_MIMES as readonly string[]).includes(mime)) {
    return true;
  }
  return mime.startsWith("text/");
}

export function attachmentKindFromMime(
  mime: string
): "image" | "audio" | "text" | "pdf" | null {
  if (isAllowedImageMime(mime) || mime === "image/gif") return "image";
  if ((ALLOWED_AUDIO_MIMES as readonly string[]).includes(mime)) return "audio";
  if ((ALLOWED_PDF_MIMES as readonly string[]).includes(mime)) return "pdf";
  if ((ALLOWED_DOCX_MIMES as readonly string[]).includes(mime)) return "text";
  if ((ALLOWED_TEXT_MIMES as readonly string[]).includes(mime) || mime.startsWith("text/")) {
    return "text";
  }
  return null;
}

export function maxBytesForMime(mime: string): number {
  const kind = attachmentKindFromMime(mime);
  if (kind === "text") return MAX_TEXT_BYTES;
  return MAX_BINARY_BYTES;
}

export const FILE_INPUT_ACCEPT = [
  ...ALLOWED_IMAGE_MIMES,
  ...ALLOWED_AUDIO_MIMES,
  ...ALLOWED_TEXT_MIMES,
  ...ALLOWED_PDF_MIMES,
  ...ALLOWED_DOCX_MIMES,
  "text/*",
  ".pdf",
  ".docx"
].join(",");
