import { DesktopShell } from "./shell/DesktopShell";
import { MobileShell } from "./shell/MobileShell";
import { useAppBootstrap } from "./shared/hooks/useAppBootstrap";
import { useShellLayout } from "./shared/hooks/useShellLayout";

export function App() {
  const layout = useShellLayout();
  const { theme, setTheme, onToggleTheme } = useAppBootstrap();

  if (layout === "mobile") {
    return (
      <MobileShell theme={theme} onThemeChange={setTheme} onToggleTheme={onToggleTheme} />
    );
  }

  return (
    <DesktopShell theme={theme} onThemeChange={setTheme} onToggleTheme={onToggleTheme} />
  );
}
