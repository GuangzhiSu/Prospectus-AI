export const CONTRACT_VERSION = "1.0" as const;

export type AiTask = "agent1" | "agent2";

export interface AiJob {
  contract_version: typeof CONTRACT_VERSION;
  job_id: string;
  task: AiTask;
  inputs: {
    materials_dir: string;
    agent1_output_dir?: string;
    section_requirements_path?: string;
    issuer_metadata_path?: string;
    kg_inputs_dir?: string;
    project_id?: string | null;
  };
  outputs: {
    work_dir: string;
    result_manifest_path?: string;
  };
  options?: {
    model?: string;
    sections?: string[];
    modification_instructions?: string;
    max_context_chars?: number;
    max_revision_loops?: number;
    text_chunk_size?: number;
    text_chunk_overlap?: number;
    stream_progress?: boolean;
    finalize_bundle?: boolean;
  };
}

export interface AiResult {
  contract_version: typeof CONTRACT_VERSION;
  job_id: string;
  task: AiTask;
  status: "success" | "error";
  error?: { message: string; detail?: string };
  outputs: Record<string, unknown>;
}
