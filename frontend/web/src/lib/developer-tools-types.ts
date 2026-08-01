export type DeveloperSectionSummary = {
  id: string;
  title: string;
  pageStart?: number;
  pageEnd?: number;
  referenceCharacters: number;
  promptId?: string;
};

export type DeveloperCompanySummary = {
  id: string;
  name: string;
  sourceFile: string;
  totalPages?: number;
  fileCount: number;
  sectionCount: number;
  sections: DeveloperSectionSummary[];
};

export type DeveloperDatasetIndex = {
  generatedAt: string;
  companyCount: number;
  promptCount: number;
  groundTruthAudit?: Record<string, number>;
  companies: DeveloperCompanySummary[];
};

export type DeveloperFile = {
  name: string;
  path: string;
  category: string;
  size: number;
  sourceMethod?: string;
  sectionHint?: string;
  pageStart?: number;
  pageEnd?: number;
  missingFields?: string[];
};

export type DeveloperSection = DeveloperSectionSummary & {
  referenceText: string;
  preparedData: Record<string, unknown>;
  subsections?: unknown[];
  confidence?: number;
};

export type DeveloperCompany = {
  id: string;
  name: string;
  sourceFile: string;
  totalPages?: number;
  files: DeveloperFile[];
  sections: DeveloperSection[];
};

export type DeveloperPrompt = {
  id: string;
  sectionId: string;
  name: string;
  requirements: string;
  prompt: string;
};

export type DeveloperPromptOverride = {
  requirements: string;
  updatedAt: string;
  source: "manual" | "rca";
  commitSha?: string;
  commitUrl?: string;
};

export type DeveloperPromptSyncStatus = {
  configured: boolean;
  repository: string;
  branch: string;
  path: string;
  source: "github" | "local";
  error?: string;
};

export type DeveloperPromptsResponse = {
  prompts: DeveloperPrompt[];
  overrides: Record<string, DeveloperPromptOverride>;
  sync: DeveloperPromptSyncStatus;
};

export type DeveloperPromptMutationResponse = {
  override?: DeveloperPromptOverride;
  removed?: boolean;
  sync: DeveloperPromptSyncStatus;
};

export type ModelProviderId = "openai" | "deepseek" | "qwen_api" | "anthropic";

export type ModelConfig = {
  provider: ModelProviderId;
  model: string;
  apiKey?: string;
  baseUrl?: string;
};

export type RcaAttribution = "data_incomplete" | "prompt_incomplete" | "model_limitation";

export type RcaDiagnosis = {
  primaryAttribution: RcaAttribution;
  confidence: number;
  summary: string;
  evidence: string[];
  dataGaps: string[];
  promptGaps: string[];
  modelLimitations: string[];
  recommendedAction: string;
  dimensions: {
    completeness: number;
    factuality: number;
    structure: number;
    style: number;
  };
};

export type RcaCaseResult = {
  generatedOutput: string;
  diagnosis: RcaDiagnosis;
  model: string;
  provider: ModelProviderId;
  generatedAt: string;
  contextCoverage: {
    preparedDataCharacters: number;
    preparedDataCharactersUsed: number;
    referenceCharacters: number;
    referenceCharactersUsed: number;
  };
};

export type PromptSuggestion = {
  summary: string;
  rationale: string;
  additions: string[];
  removals: string[];
  goodExample: string;
  badExample: string;
  revisedRequirements: string;
  caution: string;
  basedOnCaseCount: number;
  suggestionRound: 1;
};
