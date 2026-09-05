export type DeveloperSectionSummary = {
  id: string;
  title: string;
  pageStart?: number;
  pageEnd?: number;
  referenceCharacters: number;
  preparedDataCharacters: number;
  rcaReady: boolean;
  promptId?: string;
  contractCoverage?: ContractCoverage;
  contractVersion?: string;
  contractSourceHash?: string;
};

export type ContractCoverage = {
  required: number;
  applicable: number;
  populated: number;
  percent: number;
  evidenceAtoms?: number;
  sectionUnits?: number;
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
  executionContractAudit?: Record<string, string | number>;
  benchmarkSplit?: {
    method: string;
    trainingCompanyCount: number;
    holdoutCompanyCount: number;
    holdoutCompanyIds: string[];
  };
  sectionProfiles?: Record<
    string,
    {
      source: string;
      sampleCount: number;
      lengthCharacters: { p25: number; median: number; p75: number };
      commonOutline: string[];
    }
  >;
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

export type DeveloperCompanyOverview = Omit<DeveloperCompany, "sections"> & {
  sections: DeveloperSectionSummary[];
};

export type DeveloperSectionPage = {
  section: DeveloperSection;
  evidenceAtoms: Array<Record<string, unknown>>;
  evidenceAtomPage: {
    offset: number;
    limit: number;
    total: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
};

export type DeveloperPrompt = {
  id: string;
  sectionId: string;
  name: string;
  requirements: string;
  prompt: string;
  executionContract?: SectionExecutionContract;
};

export type EvidenceFieldContract = {
  fieldId: string;
  label: string;
  aliases: string[];
  required: boolean;
  description?: string;
};

export type SectionUnitPlan = {
  unitId: string;
  order: number;
  title: string;
  instruction: string;
  requiredFieldIds: string[];
  tableRequirements: string[];
  targetCharacters: number;
  evidenceAtomIds?: string[];
  evidenceAtomCount?: number;
};

export type SectionExecutionContract = {
  version: string;
  promptId: string;
  sectionId: string;
  sectionName: string;
  generationMode: string;
  isLongSection: boolean;
  fields: EvidenceFieldContract[];
  units: SectionUnitPlan[];
  sourceHash: string;
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
  verifiedAt?: string;
};

export type DeveloperToolsHealth = {
  ok: boolean;
  checkedAt: string;
  dataset: {
    ready: boolean;
    companyCount?: number;
    sectionCount?: number;
    promptCount?: number;
    auditPassed?: number;
    auditFailed?: number;
    sampleReadable?: boolean;
    contractVersion?: string;
    contractCount?: number;
    shortSectionCoveragePercent?: number;
    longSectionCoveragePercent?: number;
    structureProfileCount?: number;
    error?: string;
  };
  promptSync: {
    ready: boolean;
    configured: boolean;
    source: "github" | "local";
    repository: string;
    branch: string;
    path: string;
    error?: string;
  };
  rca: {
    configuredProviders: ModelProviderId[];
  };
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

export type RcaAttribution =
  | "data_incomplete"
  | "prompt_incomplete"
  | "prompt_or_workflow"
  | "model_limitation"
  | "none";

export type DeterministicEvaluation = {
  overallScore: number;
  inputFieldCoverage: number;
  requiredFactRecall: number;
  numericFidelity: { precision: number; recall: number };
  groundedClaimPrecision: number;
  structureCoverage: number;
  outlineOrderSimilarity: number;
  referenceOutlineSimilarity: number;
  lengthProfile: number;
  placeholderIntegrity: number;
  crossSectionConsistency: number;
  hardFailures: string[];
  missingFields: string[];
  missingFacts: string[];
  unsupportedNumbers: string[];
  unsupportedDates: string[];
  unsupportedEntities: string[];
  rootCause: RcaAttribution;
};

export type RcaRunManifest = {
  contractVersion: string;
  contractSourceHash: string;
  promptSha: string;
  datasetGeneratedAt?: string;
  dataAuditVersion?: string;
  structureProfileSource?: string;
  model: string;
  provider: ModelProviderId;
};

export type RcaPlanResponse = {
  companyId: string;
  companyName: string;
  sectionId: string;
  sectionName: string;
  contract: SectionExecutionContract;
  units: SectionUnitPlan[];
  inputCoverage: ContractCoverage;
  promptSha: string;
  structureProfile?: NonNullable<DeveloperDatasetIndex["sectionProfiles"]>[string];
};

export type RcaUnitResult = {
  unitId: string;
  annotatedDraft: string;
  cleanDraft: string;
  deterministicEvaluation: DeterministicEvaluation;
  revisionApplied: boolean;
  verificationIssues: string[];
  model: string;
  provider: ModelProviderId;
  generatedAt: string;
};

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
  cleanDraft?: string;
  annotatedDraft?: string;
  deterministicEvaluation?: DeterministicEvaluation;
  runManifest?: RcaRunManifest;
  legacyModelJudge?: RcaDiagnosis;
  legacyModelJudgeError?: string;
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
