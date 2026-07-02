import { useCallback, useEffect, useState } from "react";
import { isTauri, readFullscreen, toggleFullscreen } from "../lib/tauriWindow";

export function useTauriFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);

  const syncFullscreen = useCallback(async () => {
    if (!isTauri()) return;
    setFullscreen(await readFullscreen());
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    void syncFullscreen();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "F11") return;
      e.preventDefault();
      void toggleFullscreen().then(setFullscreen);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("focus", syncFullscreen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("focus", syncFullscreen);
    };
  }, [syncFullscreen]);

  return fullscreen;
}
