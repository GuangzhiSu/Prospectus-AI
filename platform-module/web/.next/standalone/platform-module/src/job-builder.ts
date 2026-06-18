/**
 * Build contract v1 job manifests (platform → AI).
 */

import { randomUUID } from "crypto";
import type { AiJob, AiJobOptions, WorkspacePaths } from "./contracts";
import { CONTRACT_VERSION } from "./contracts";

export function buildAgent1Job(
  ws: WorkspacePaths,
  options: AiJobOptions & { jobId?: string; projectId?: string | null } = {}
): AiJob {
  const { jobId, projectId, ...rest } = options;
  return {
    contract_version: CONTRACT_VERSION,
    job_id: jobId ?? `agent1-${randomUUID().slice(0, 12)}`,
    task: "agent1",
    inputs: {
      materials_dir: ws.materials,
      project_id: projectId ?? null,
    },
    outputs: { work_dir: ws.agent1Output },
    options: rest,
  };
}

export function buildAgent2Job(
  ws: WorkspacePaths,
  options: AiJobOptions & { jobId?: string } = {}
): AiJob {
  const { jobId, ...rest } = options;
  const inputs: AiJob["inputs"] = {
    materials_dir: ws.materials,
    agent1_output_dir: ws.agent1Output,
    section_requirements_path: ws.sectionRequirements,
    issuer_metadata_path: ws.issuerMetadata,
    kg_inputs_dir: ws.kgInputs,
  };
  return {
    contract_version: CONTRACT_VERSION,
    job_id: jobId ?? `agent2-${randomUUID().slice(0, 12)}`,
    task: "agent2",
    inputs,
    outputs: { work_dir: ws.agent2Output },
    options: {
      stream_progress: true,
      finalize_bundle: true,
      ...rest,
    },
  };
}
