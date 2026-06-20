import { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "../../../shared/components/toastStore";

type Props = {
  className?: string;
  children: string;
};

function languageFromClassName(className?: string): string {
  const match = /language-([\w-]+)/.exec(className ?? "");
  return match?.[1] ?? "text";
}

function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "default"
        });
        if (!containerRef.current || cancelled) return;
        const { svg } = await mermaid.render(`mermaid-${crypto.randomUUID()}`, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not render diagram.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return <pre className="markdown-pre">{code}</pre>;
  }

  return <div ref={containerRef} className="markdown-mermaid" />;
}

export function MarkdownCodeBlock({ className, children }: Props) {
  const [copied, setCopied] = useState(false);
  const code = children.replace(/\n$/, "");
  const language = languageFromClassName(className);
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast("Code copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  if (language === "mermaid") {
    return (
      <div className="markdown-code-block markdown-mermaid-block">
        <div className="markdown-code-header">
          <span className="markdown-code-lang">mermaid</span>
          <button type="button" className="markdown-code-copy" onClick={() => void onCopy()}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <MermaidBlock code={code} />
      </div>
    );
  }

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
