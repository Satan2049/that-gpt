import { useEffect } from "react";
import { DesktopShell } from "./shell/DesktopShell";
import { MobileShell } from "./shell/MobileShell";
import { TitleBar } from "./shell/TitleBar";
import { OnboardingModal } from "./shared/components/OnboardingModal";
import { useAppBootstrap } from "./shared/hooks/useAppBootstrap";
import { useShellLayout } from "./shared/hooks/useShellLayout";
import { useTauriFullscreen } from "./shared/hooks/useTauriFullscreen";
import { useLocaleStore } from "./shared/i18n/localeStore";
import { isTauri } from "./shared/lib/tauriWindow";

export function App() {
  const { theme, setTheme } = useAppBootstrap();
  const onboardingComplete = useLocaleStore((s) => s.onboardingComplete);
  const fullscreen = useTauriFullscreen();
  const layout = useShellLayout();
  const isMobile = layout === "mobile";

  useEffect(() => {
    document.body.classList.toggle("layout-mobile", isMobile);
    return () => document.body.classList.remove("layout-mobile");
  }, [isMobile]);

  const shell = isMobile ? (
    <MobileShell theme={theme} onThemeChange={setTheme} />
  ) : (
    <DesktopShell theme={theme} onThemeChange={setTheme} />
  );

  const content = (
    <>
      {shell}
      {!onboardingComplete ? <OnboardingModal /> : null}
    </>
  );

  if (!isTauri() || isMobile) {
    return content;
  }

  return (
    <div className={`desktop-root${fullscreen ? " desktop-root--fullscreen" : ""}`}>
      {!fullscreen ? <TitleBar /> : null}
      <div className="desktop-content">{content}</div>
    </div>
  );
}
