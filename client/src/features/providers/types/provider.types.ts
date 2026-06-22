export type ProviderKind = "openai" | "ollama";

export type ProviderProfile = {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  imageModel: string;
  audioModel: string;
};

export type ProviderStore = {
  activeId: string;
  providers: ProviderProfile[];
};

export type UpsertProviderInput = {
  id?: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  imageModel?: string;
  audioModel?: string;
};
