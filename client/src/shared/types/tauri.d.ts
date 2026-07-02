/**
 * Tauri global API typings (enabled via withGlobalTauri in tauri.conf.json).
 * @see https://v2.tauri.app/reference/javascript/api/
 */
interface TauriGlobal {
  /** Tauri 1.x / compatibility shim */
  invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  core?: {
    invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
  event?: {
    listen: (
      event: string,
      handler: (event: { payload: unknown }) => void
    ) => Promise<() => void>;
  };
  window?: {
    getCurrentWindow: () => {
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      isFullscreen: () => Promise<boolean>;
      setFullscreen: (fullscreen: boolean) => Promise<void>;
      startDragging: () => Promise<void>;
    };
  };
}

declare global {
  interface Window {
    __TAURI__?: TauriGlobal;
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }
}

export {};
