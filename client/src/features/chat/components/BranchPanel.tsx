import { useMemo, useState } from "react";
import { useChatStore } from "../store/chatStore";
import { listBranchPoints } from "../lib/branchUtils";

export function BranchPanel() {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const selectBranch = useChatStore((s) => s.selectBranch);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);

  const branchPoints = useMemo(
    () => (activeConversation ? listBranchPoints(activeConversation) : []),
    [activeConversation]
  );

  if (!activeConversation || branchPoints.length === 0) {
    return (
      <aside className="branch-panel">
        <h3 className="branch-panel-title">Branches</h3>
        <p className="branch-panel-empty">No alternate branches yet. Regenerate with “New branch” to create one.</p>
      </aside>
    );
  }

  const compareMessages = compareIds
    ? compareIds
        .map((id) => activeConversation.messages.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
    : [];

  return (
    <aside className="branch-panel">
      <h3 className="branch-panel-title">Branches</h3>
      <ul className="branch-tree">
        {branchPoints.map((point) => (
          <li key={point.parentId} className="branch-tree-item">
            <p className="branch-tree-prompt">{point.userContent.slice(0, 80)}…</p>
            <div className="branch-tree-options">
              {point.branches.map((branch, idx) => {
                const active =
                  activeConversation.branchPicks?.[point.parentId] === branch.id ||
                  (!activeConversation.branchPicks?.[point.parentId] &&
                    idx === point.branches.length - 1);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    className={active ? "branch-option active" : "branch-option"}
                    onClick={() => void selectBranch(point.parentId, branch.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setCompareIds((prev) => {
                        if (!prev) return [branch.id, branch.id];
                        if (prev[0] === branch.id) return prev;
                        return [prev[0], branch.id];
                      });
                    }}
                  >
                    Branch {idx + 1}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {compareMessages.length === 2 ? (
        <div className="branch-compare">
          <h4>Compare</h4>
          <div className="branch-compare-grid">
            {compareMessages.map((msg) => (
              <div key={msg.id} className="branch-compare-col">
                <pre>{msg.content}</pre>
              </div>
            ))}
          </div>
          <button type="button" className="branch-compare-clear" onClick={() => setCompareIds(null)}>
            Clear compare
          </button>
        </div>
      ) : (
        <p className="branch-panel-hint">Right-click two branches to compare side by side.</p>
      )}
    </aside>
  );
}
