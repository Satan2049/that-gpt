import { useState } from "react";
import { toast } from "../../../shared/components/toastStore";

type Props = {
  content: string;
  canRegenerate: boolean;
  onRegenerate: () => void;
  regenerating: boolean;
};

export function MessageActions({
  content,
  canRegenerate,
  onRegenerate,
  regenerating
}: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast("Message copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="message-actions">
      <button type="button" className="message-action-btn" onClick={() => void onCopy()}>
        {copied ? "Copied" : "Copy"}
      </button>
      {canRegenerate ? (
        <button
          type="button"
          className="message-action-btn"
          disabled={regenerating}
          onClick={onRegenerate}
        >
          {regenerating ? "Regenerating…" : "Regenerate"}
        </button>
      ) : null}
    </div>
  );
}
