import { useShellLayout } from "./useShellLayout";

export function useMobileLayout(): boolean {
  return useShellLayout() === "mobile";
}
