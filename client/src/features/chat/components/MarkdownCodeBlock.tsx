import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

type Props = {
  className?: string;
  children: string;
};

function languageFromClassName(className?: string): string {
  const match = /language-([\w-]+)/.exec(className ?? "");
  return match?.[1] ?? "text";
}

export function MarkdownCodeBlock({ className, children }: Props) {
  const [copied, setCopied] = useState(false);
  const code = children.replace(/\n$/, "");
  const language = languageFromClassName(className);
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark";

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-header">
        <span className="markdown-code-lang">{language}</span>
        <button type="button" className="markdown-code-copy" onClick={() => void onCopy()}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={isDark ? oneDark : oneLight}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0 0 10px 10px",
          fontSize: "0.88em",
          background: "transparent"
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
