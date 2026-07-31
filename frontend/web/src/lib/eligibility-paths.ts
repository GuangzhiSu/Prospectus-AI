import path from "path";
import { existsSync } from "fs";
import { getProspectusRoot } from "@/lib/prospectus-root";

export function getEligibilityPackageRoot(root = getProspectusRoot()): string {
  const candidates = [
    path.join(root, "eligibility"),
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "eligibility", "__main__.py"))) {
      return candidate;
    }
  }
  return path.join(root, "eligibility");
}
