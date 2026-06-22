export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ModelInfo = {
  id: string;
  vision: boolean;
  tools: boolean;
  reasoning: boolean;
  embedding: boolean;
  audio: boolean;
  imageGen: boolean;
  contextWindow: number;
  maxOutputTokens: number;
};

export type ModelsListResult = {
  models: string[];
  modelInfos: ModelInfo[];
  source: string;
};

export type KnowledgeCitation = {
  index: number;
  sourceName: string;
  sourcePath: string;
  excerpt: string;
};
