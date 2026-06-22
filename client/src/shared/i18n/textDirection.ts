const RTL_SCRIPT =
  /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Detect dominant direction for a text block (fallback when dir="auto" is not enough). */
export function detectTextDirection(text: string): "rtl" | "ltr" {
  let rtl = 0;
  let ltr = 0;
  for (const char of text) {
    if (RTL_SCRIPT.test(char)) rtl += 1;
    else if (/[A-Za-z]/.test(char)) ltr += 1;
  }
  if (rtl === 0 && ltr === 0) return "ltr";
  return rtl >= ltr ? "rtl" : "ltr";
}

/** Props for elements that should follow content direction automatically. */
export const autoDirProps = {
  dir: "auto" as const,
  style: { unicodeBidi: "plaintext" as const }
};
