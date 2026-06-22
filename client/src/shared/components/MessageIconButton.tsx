import type { ReactNode } from "react";

type Props = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  children: ReactNode;
};

export function MessageIconButton({ label, onClick, disabled, active, className, children }: Props) {
  const classes = ["message-icon-btn", active ? "active" : "", className].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
