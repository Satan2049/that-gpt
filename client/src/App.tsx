import { DesktopShell } from "./shell/DesktopShell";
import { OnboardingModal } from "./shared/components/OnboardingModal";
import { useAppBootstrap } from "./shared/hooks/useAppBootstrap";
import { useLocaleStore } from "./shared/i18n/localeStore";

export function App() {
  const { theme, setTheme } = useAppBootstrap();
  const onboardingComplete = useLocaleStore((s) => s.onboardingComplete);

  return (
    <>
      <DesktopShell theme={theme} onThemeChange={setTheme} />
      {!onboardingComplete ? <OnboardingModal /> : null}
    </>
  );
}
