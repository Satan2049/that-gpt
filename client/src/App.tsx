import { DesktopShell } from "./shell/DesktopShell";
import { useAppBootstrap } from "./shared/hooks/useAppBootstrap";

export function App() {
  const { theme, setTheme } = useAppBootstrap();

  return <DesktopShell theme={theme} onThemeChange={setTheme} />;
}
