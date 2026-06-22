export function downloadTextFile(filename: string, content: string, mimeType = "text/plain"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFilename(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return cleaned || "conversation";
}

export function conversationExportFilename(
  title: string,
  format: "json" | "markdown" | "html"
): string {
  const ext = format === "json" ? "json" : format === "html" ? "html" : "md";
  return `${safeFilename(title)}.${ext}`;
}
