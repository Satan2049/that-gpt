import { create } from "zustand";

type ToastItem = {
  id: string;
  message: string;
};

type ToastState = {
  items: ToastItem[];
  push: (message: string) => void;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (message) => {
    const id = crypto.randomUUID();
    set((state) => ({ items: [...state.items, { id, message }] }));
    window.setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    }, 2800);
  },
  dismiss: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
}));

export function toast(message: string): void {
  useToastStore.getState().push(message);
}
