export type AppSettings = {
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  aiImageModel: string;
  aiAudioModel: string;
  aiDefaultSystemPrompt: string;
  aiRequestTimeoutMs: number;
  aiMaxRetries: number;
  configDir: string;
  maxImagesPerMessage: number;
  maxImageBytes: number;
};

export type UpdateSettingsInput = {
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  aiImageModel: string;
  aiAudioModel: string;
  aiDefaultSystemPrompt: string;
  aiRequestTimeoutMs: number;
  aiMaxRetries: number;
};
