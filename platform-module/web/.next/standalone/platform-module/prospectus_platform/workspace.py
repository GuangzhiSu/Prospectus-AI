"""Standard workspace layout for platform ↔ AI handoff."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class WorkspaceLayout:
    """
    Canonical directory tree the platform module maintains.

    workspace/
      materials/           ← issuer .xlsx / .json (platform ingests uploads here)
      platform-config/     ← prompts & KG contracts (platform-owned, not in AI module)
        agent2_section_requirements.json
        issuer_metadata.json
        kg-inputs/
          input_schema.json
          input_schema_crosswalk.json
      agent1-output/       ← AI module writes here (contract artifacts)
      agent2-output/       ← AI module writes here (draft markdown)
      jobs/                ← transient ai-job.json files
    """

    root: Path

    @property
    def materials(self) -> Path:
        return self.root / "materials"

    @property
    def platform_config(self) -> Path:
        return self.root / "platform-config"

    @property
    def section_requirements(self) -> Path:
        return self.platform_config / "agent2_section_requirements.json"

    @property
    def issuer_metadata(self) -> Path:
        return self.platform_config / "issuer_metadata.json"

    @property
    def kg_inputs(self) -> Path:
        return self.platform_config / "kg-inputs"

    @property
    def agent1_output(self) -> Path:
        return self.root / "agent1-output"

    @property
    def agent2_output(self) -> Path:
        return self.root / "agent2-output"

    @property
    def jobs(self) -> Path:
        return self.root / "jobs"

    def ensure(self) -> None:
        for path in (
            self.materials,
            self.platform_config,
            self.kg_inputs,
            self.agent1_output,
            self.agent2_output,
            self.jobs,
        ):
            path.mkdir(parents=True, exist_ok=True)
