type Props = {
  rows?: number;
  className?: string;
};

export function Skeleton({ rows = 3, className = "" }: Props) {
  return (
    <div className={`skeleton-block ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-line" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="conversation-skeleton">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skeleton-conversation-item" />
      ))}
    </div>
  );
}
