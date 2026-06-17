import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownCodeBlock } from "./MarkdownCodeBlock";

type Props = {
  content: string;
};

export function MessageMarkdown({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
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
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
