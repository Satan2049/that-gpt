import { useCallback, useRef, useState } from "react";
import { invoke } from "../../../shared/lib/tauriInvoke";

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read audio"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read audio"));
    reader.readAsDataURL(blob);
  });
}

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const modeRef = useRef<"speech" | "whisper" | null>(null);

  const cleanupMedia = useCallback(() => {
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const stopListening = useCallback(async () => {
    const mode = modeRef.current;
    modeRef.current = null;

    if (mode === "speech") {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    if (mode === "whisper") {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanupMedia();
        setListening(false);
        return;
      }

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });

      const mimeType = recorder.mimeType || "audio/webm";
      cleanupMedia();
      setListening(false);

      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size === 0) return;

      try {
        const base64 = await blobToBase64(blob);
        const transcript = await invoke<string>("transcribe_voice", {
          body: { base64, mimeType }
        });
        const trimmed = transcript.trim();
        if (trimmed) onTranscript(trimmed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Voice transcription failed");
      }
    }
  }, [cleanupMedia, onTranscript]);

  const startListening = useCallback(async () => {
    if (listening) return;
    setError(null);

    const SpeechRecognitionClass = getSpeechRecognition();
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = document.documentElement.lang || "en-US";
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0]?.[0]?.transcript?.trim();
          if (transcript) onTranscript(transcript);
        };
        recognition.onerror = () => {
          setError(null);
        };
        recognition.onend = () => {
          recognitionRef.current = null;
          modeRef.current = null;
          setListening(false);
        };
        recognitionRef.current = recognition;
        modeRef.current = "speech";
        recognition.start();
        setListening(true);
        return;
      } catch {
        // fall through to Whisper
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      modeRef.current = "whisper";
      recorder.start();
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone access denied");
    }
  }, [listening, onTranscript]);

  return {
    listening,
    error,
    startListening,
    stopListening,
    clearError: () => setError(null)
  };
}
