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

export type DiagnosticCause = "criteria" | "extraction" | "diagnostic" | "ready";

export type DiagnosticMarket = {
  key: string;
  label: string;
  labelZh: string;
  rulesets: string[];
};

export type DiagnosticCheck = {
  id: string;
  metric: string;
  operator: string;
  inputPath?: string | null;
  profileField?: string | null;
  thresholdValue?: unknown;
  thresholdUnit?: string | null;
  thresholdVerified?: boolean;
  needsHumanVerify?: boolean;
  requiresLlm?: boolean;
  ruleRef?: string;
  guidanceNote?: string;
  verifiedAgainst?: string;
  verifiedOn?: string;
  dateNote?: string;
};

export type DiagnosticWorkbookRow = {
  rowId: string;
  market: string;
  board: string;
  standard: string;
  limb: string;
  metricField: string;
  op: string;
  value: string;
  unit: string;
  citation: string;
  url: string;
  effectiveFrom: string;
  verified: string;
  reviewStatus: string;
  notes: string;
};

export type DiagnosticGate = {
  id: string;
  title: string;
  ruleRef: string;
  ruleset: string;
  rulesetName: string;
  sourceFile: string;
  layer: "hard" | "soft" | string;
  marketKeys: string[];
  evaluated: boolean;
  requiresLlm: boolean;
  needsHumanVerify: boolean;
  humanSignoff: boolean;
  stubReason: string;
  effectiveFrom?: string | null;
  sourceRef?: string;
  inRegressionBaseline?: boolean;
  version?: string;
  condition?: string;
  severity?: string;
  guidanceRef?: string;
  substantiveConcern?: string;
  remediationPath?: string;
  disclosedInSection?: string[];
  checks: DiagnosticCheck[];
  staticCause: DiagnosticCause;
  staticReason: string;
  workbookRows?: DiagnosticWorkbookRow[];
  status?: string;
  note?: string;
  runtimeCause?: DiagnosticCause;
  runtimeReason?: string;
  missingInputs?: Array<{ checkId: string; path: string; reason: string }>;
  checkResults?: Array<{
    id: string;
    metric: string;
    status: string;
    required?: string;
    actual?: unknown;
    path?: string;
    note?: string;
  }>;
};

export type DiagnosticRuleset = {
  id: string;
  name: string;
  sourceFile: string;
  layer: string;
  version: string;
  sourceRef: string;
  inRegressionBaseline: boolean;
  gateCount: number;
  notEvaluatedCount: number;
  marketKeys: string[];
};

export type DiagnosticField = {
  key: string;
  inputPath?: string | null;
  profileField?: string | null;
  kind: "issuer" | "profile" | string;
  gates: string[];
  metrics: string[];
};

export type DiagnosticSourceDoc = {
  id: string;
  title: string;
  note: string;
  path: string;
  exists: boolean;
  kind: "markdown" | "csv" | "xlsx" | string;
  characters: number;
  content: string;
  sheets?: Array<{ name: string; rows: number }>;
};

export type DiagnosticCatalog = {
  runtime?: {
    mode: "live" | "snapshot";
    readOnly: boolean;
    traceAvailable: boolean;
    message: string;
  };
  markets: DiagnosticMarket[];
  rulesets: DiagnosticRuleset[];
  gates: DiagnosticGate[];
  fields: DiagnosticField[];
  sourceDocs: DiagnosticSourceDoc[];
  workbook: {
    path: string;
    exists: boolean;
    xlsxExpected: string;
    xlsxPresent: boolean;
    rowCount?: number;
  };
  workbookRows: DiagnosticWorkbookRow[];
  summary: {
    gateCount: number;
    rulesetCount: number;
    readyCount: number;
    criteriaCount: number;
    diagnosticCount: number;
    workbookRowCount: number;
    xlsxPresent: boolean;
  };
  legend: Record<DiagnosticCause, string>;
};

export type DiagnosticGatePatch = {
  sourceFile: string;
  gateId: string;
  evaluated?: boolean;
  stubReason?: string;
  title?: string;
  ruleRef?: string;
  checks?: Array<{
    id: string;
    thresholdValue?: unknown;
    thresholdUnit?: string;
  }>;
};

export type DiagnosticTrace = {
  issuerId: string;
  marketKey?: string | null;
  rulesetNames: string[];
  summary: Record<string, number>;
  presentFieldCount: number;
  missingFieldCount: number;
  missingFields: string[];
  presentFields: string[];
  gates: DiagnosticGate[];
};
