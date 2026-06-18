/**
 * Contract v1 types — Platform ↔ AI module boundary.
 * Keep in sync with modular/contracts/v1/*.schema.json
 */

export const CONTRACT_VERSION = "1.0" as const;

export type AiTask = "agent1" | "agent2";

export interface AiJobInputs {
  materials_dir: string;
  agent1_output_dir?: string;
  section_requirements_path?: string;
  issuer_metadata_path?: string;
  kg_inputs_dir?: string;
  data_manifest_path?: string;
  project_id?: string | null;
}

export interface AiJobOutputs {
  work_dir: string;
  result_manifest_path?: string;
}

export interface AiJobOptions {
  model?: string;
  sections?: string[];
  modification_instructions?: string;
  max_context_chars?: number;
  max_revision_loops?: number;
  text_chunk_size?: number;
  text_chunk_overlap?: number;
  stream_progress?: boolean;
  finalize_bundle?: boolean;
}

export interface AiJob {
  contract_version: typeof CONTRACT_VERSION;
  job_id: string;
  task: AiTask;
  inputs: AiJobInputs;
  outputs: AiJobOutputs;
  options?: AiJobOptions;
}

export interface AiResultSectionFile {
  section_id: string;
  path: string;
}

export interface AiResultOutputs {
  work_dir: string;
  agent1_manifest_path?: string;
  text_chunks_path?: string;
  fact_store_path?: string;
  rag_chunks_path?: string;
  combined_draft_path?: string;
  section_files?: AiResultSectionFile[];
  bundle_artifacts?: Record<string, string>;
}

export interface AiResult {
  contract_version: typeof CONTRACT_VERSION;
  job_id: string;
  task: AiTask;
  status: "success" | "error";
  started_at?: string;
  finished_at?: string;
  error?: { message: string; detail?: string };
  outputs: AiResultOutputs;
  metrics?: Record<string, number>;
}

/** Standard workspace paths (platform-owned layout). */
export interface WorkspacePaths {
  root: string;
  materials: string;
  platformConfig: string;
  sectionRequirements: string;
  issuerMetadata: string;
  kgInputs: string;
  agent1Output: string;
  agent2Output: string;
  jobs: string;
}

export function workspacePaths(root: string): WorkspacePaths {
  const join = (...parts: string[]) => parts.join("/").replace(/\/+/g, "/");
  return {
    root,
    materials: join(root, "materials"),
    platformConfig: join(root, "platform-config"),
    sectionRequirements: join(root, "platform-config/agent2_section_requirements.json"),
    issuerMetadata: join(root, "platform-config/issuer_metadata.json"),
    kgInputs: join(root, "platform-config/kg-inputs"),
    agent1Output: join(root, "agent1-output"),
    agent2Output: join(root, "agent2-output"),
    jobs: join(root, "jobs"),
  };
}
