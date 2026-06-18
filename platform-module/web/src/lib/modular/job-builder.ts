import path from "path";
import { existsSync } from "fs";
import type { AiJob } from "./contracts";
import { CONTRACT_VERSION } from "./contracts";
import { workspacePaths } from "./paths";

function newJobId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildAgent1Job(
  options: { model?: string; jobId?: string } = {}
): AiJob {
  const ws = workspacePaths();
  return {
    contract_version: CONTRACT_VERSION,
    job_id: options.jobId ?? newJobId("agent1"),
    task: "agent1",
    inputs: { materials_dir: ws.data },
    outputs: { work_dir: ws.agent1Output },
    options: { model: options.model },
  };
}

export function buildAgent2Job(
  options: {
    model?: string;
    sections?: string[];
    modification_instructions?: string;
    jobId?: string;
  } = {}
): AiJob {
  const ws = workspacePaths();
  const inputs: AiJob["inputs"] = {
    materials_dir: ws.data,
    agent1_output_dir: ws.agent1Output,
    section_requirements_path: ws.sectionRequirements,
  };
  if (existsSync(ws.issuerMetadata)) {
    inputs.issuer_metadata_path = ws.issuerMetadata;
  }
  if (existsSync(path.join(ws.kgInputs, "input_schema_crosswalk.json"))) {
    inputs.kg_inputs_dir = ws.kgInputs;
  }

  let sections = options.sections;
  if (sections?.length === 1 && sections[0] === "all") {
    sections = undefined;
  }

  return {
    contract_version: CONTRACT_VERSION,
    job_id: options.jobId ?? newJobId("agent2"),
    task: "agent2",
    inputs,
    outputs: { work_dir: ws.agent2Output },
    options: {
      stream_progress: true,
      finalize_bundle: true,
      model: options.model,
      sections,
      modification_instructions: options.modification_instructions,
    },
  };
}
