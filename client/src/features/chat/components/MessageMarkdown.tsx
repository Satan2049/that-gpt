import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { MarkdownCodeBlock } from "./MarkdownCodeBlock";
import type { KnowledgeCitation } from "../../settings/types/models.types";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { autoDirProps } from "../../../shared/i18n/textDirection";

type Props = {
  content: string;
  citations?: KnowledgeCitation[];
};

function CitationLink({
  index,
  citation
}: {
  index: number;
  citation?: KnowledgeCitation;
}) {
  const [open, setOpen] = useState(false);
  if (!citation) {
    return <span className="citation-ref">[{index}]</span>;
  }
  return (
    <span className="citation-ref-wrap">
      <button
        type="button"
        className="citation-ref"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={citation.sourceName}
      >
        [{index}]
      </button>
      {open ? (
        <span className="citation-popover" role="tooltip">
          <strong>{citation.sourceName}</strong>
          <span className="citation-path">{citation.sourcePath}</span>
          <span className="citation-excerpt">{citation.excerpt}</span>
        </span>
      ) : null}
    </span>
  );
}

function renderWithCitations(content: string, citations?: KnowledgeCitation[]) {
  if (!citations?.length) return content;
  const byIndex = new Map(citations.map((c) => [c.index, c]));
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = /^\[(\d+)\]$/.exec(part);
    if (!match) return part;
    const index = Number(match[1]);
    return <CitationLink key={`cite-${i}-${index}`} index={index} citation={byIndex.get(index)} />;
  });
}

export function MessageMarkdown({ content, citations }: Props) {
  const { t } = useTranslation();
  const hasInlineCitations = citations?.length && /\[\d+\]/.test(content);

  if (hasInlineCitations) {
    return (
      <div className="message-markdown message-markdown--citations" {...autoDirProps}>
        <p className="message-markdown-cited">{renderWithCitations(content, citations)}</p>
        <footer className="citation-footnotes">
          <p className="citation-footnotes-title">{t.projects.sources}</p>
          <ol>
            {citations!.map((c) => (
              <li key={c.index} id={`cite-${c.index}`}>
                <strong>{c.sourceName}</strong>
                <span className="citation-path">{c.sourcePath}</span>
              </li>
            ))}
          </ol>
        </footer>
      </div>
    );
  }

  return (
    <div {...autoDirProps}>
      <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        pre: ({ children }) => <>{children}</>,
        code: ({ className, children, ...props }) => {
          const isBlock = Boolean(className);
          const text = String(children).replace(/\n$/, "");
          if (isBlock) {
            return <MarkdownCodeBlock className={className}>{text}</MarkdownCodeBlock>;
          }
          return (
            <code className="markdown-inline-code" {...props}>
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <div className="markdown-table-wrap">
            <table>{children}</table>
          </div>
        )
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
