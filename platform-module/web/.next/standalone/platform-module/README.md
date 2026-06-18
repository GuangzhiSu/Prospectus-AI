# Platform Module

Everything **except AI agents**: orchestration, workspace layout, web integration adapters, prompts/config ownership.

## Responsibilities

| Owns | Does not own |
|------|----------------|
| Issuer file uploads (`materials/`) | Agent1/Agent2 Python code |
| `agent2_section_requirements.json` | LangGraph nodes |
| KG input JSON (`kg-inputs/`) | Model weights / inference |
| Job manifest construction | Chunking / retrieval algorithms |
| Reading `ai-result.json` for UI/export | |

## Workspace layout

```
workspace/
  materials/                 ← uploads (.xlsx, .json, …)
  platform-config/
    agent2_section_requirements.json
    issuer_metadata.json
    kg-inputs/
      input_schema.json
      input_schema_crosswalk.json
  agent1-output/             ← AI writes here
  agent2-output/             ← AI writes here
  jobs/                      ← transient ai-job.json
```

Python API:

```python
from prospectus_platform.workspace import WorkspaceLayout
from prospectus_platform.job_builder import build_agent1_job, write_job
from prospectus_platform.ai_client import AiModuleClient

ws = WorkspaceLayout(Path("modular/workspace"))
job = build_agent1_job(ws)
path = write_job(job, ws)
AiModuleClient(Path("modular/ai-module")).run_agent1(ws, path)
```

TypeScript (Next.js API routes):

```typescript
import { runAiJob, modularPaths } from "../../../modular/platform-module/src/ai-client";
import { buildAgent2Job } from "../../../modular/platform-module/src/job-builder";
import { workspacePaths } from "../../../modular/platform-module/src/contracts";

const mp = modularPaths(process.env.PROSPECTUS_ROOT!);
const ws = workspacePaths(path.join(mp.workspace, "default"));
const job = buildAgent2Job(ws, { sections: ["Summary"] });
await runAiJob(job, {
  aiModuleRoot: mp.aiModule,
  jobFilePath: path.join(ws.jobs, `${job.job_id}.json`),
  onProgress: (line) => { /* parse @@AGENT2@@ for SSE */ },
});
```

## Demo script

```bash
# From repo root, with AI module venv ready:
python modular/platform-module/examples/run_pipeline.py \
  --workspace modular/workspace-demo \
  --task both
```

## Migrating apps/web

Replace direct `spawn("agent1.py")` in API routes with:

1. Sync uploads → `workspace/materials/`
2. Sync prompts → `workspace/platform-config/`
3. `buildAgent1Job` / `buildAgent2Job` + `runAiJob`
4. Read draft from `ai-result.json` outputs

See [`../README.md`](../README.md) for the full migration plan.
