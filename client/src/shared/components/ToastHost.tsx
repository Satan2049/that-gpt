import { useToastStore } from "./toastStore";

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!items.length) return null;

  return (
    <div className="toast-host" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className="toast-item" role="status">
          <span>{item.message}</span>
          <button type="button" className="toast-dismiss" onClick={() => dismiss(item.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
