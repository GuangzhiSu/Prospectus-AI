import { loadDeveloperPromptRequirements } from "@/lib/developer-data";
import type {
  DeveloperPromptOverride,
  DeveloperPromptSyncStatus,
} from "@/lib/developer-tools-types";

const DEFAULT_REPOSITORY = "GuangzhiSu/Prospectus-AI";
const DEFAULT_BRANCH = "main";
const DEFAULT_PATH = "ai-module/prompts/sections/requirements.json";
const GITHUB_API_VERSION = "2022-11-28";

type RequirementsEntry = Record<string, unknown> & {
  requirements?: string;
  developer_compiled_override?: string;
  developer_updated_at?: string;
  developer_source?: "manual" | "rca";
};
type RequirementsStore = Record<string, RequirementsEntry>;

type GitHubFile = {
  content?: string;
  encoding?: string;
  sha?: string;
};

type GitHubWriteResponse = {
  commit?: { sha?: string; html_url?: string };
};

type StoreSnapshot = {
  document: RequirementsStore;
  overrides: Record<string, DeveloperPromptOverride>;
  sha?: string;
  sync: DeveloperPromptSyncStatus;
};

function syncConfig() {
  return {
    token: process.env.GITHUB_PROMPT_TOKEN?.trim() || "",
    repository:
      process.env.GITHUB_PROMPT_REPOSITORY?.trim() || DEFAULT_REPOSITORY,
    branch: process.env.GITHUB_PROMPT_BRANCH?.trim() || DEFAULT_BRANCH,
    filePath: process.env.GITHUB_PROMPT_PATH?.trim() || DEFAULT_PATH,
  };
}

class GitHubPromptSyncError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number
  ) {
    super(message);
    this.name = "GitHubPromptSyncError";
  }
}

function status(
  source: DeveloperPromptSyncStatus["source"],
  error?: string,
  verifiedAt?: string
): DeveloperPromptSyncStatus {
  const config = syncConfig();
  return {
    configured: Boolean(config.token),
    repository: config.repository,
    branch: config.branch,
    path: config.filePath,
    source,
    ...(error ? { error } : {}),
    ...(verifiedAt ? { verifiedAt } : {}),
  };
}

function parseDocument(raw: string): RequirementsStore {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Section requirements file must be a JSON object.");
  }
  return parsed as RequirementsStore;
}

function extractOverrides(
  document: RequirementsStore
): Record<string, DeveloperPromptOverride> {
  const overrides: Record<string, DeveloperPromptOverride> = {};
  for (const [id, entry] of Object.entries(document)) {
    if (
      typeof entry.developer_compiled_override === "string" &&
      typeof entry.developer_updated_at === "string" &&
      (entry.developer_source === "manual" || entry.developer_source === "rca")
    ) {
      overrides[id] = {
        requirements: entry.developer_compiled_override,
        updatedAt: entry.developer_updated_at,
        source: entry.developer_source,
      };
    }
  }
  return overrides;
}

async function readLocalDocument(): Promise<RequirementsStore> {
  return (await loadDeveloperPromptRequirements()) as RequirementsStore;
}

function githubFileUrl(): string {
  const config = syncConfig();
  const encodedPath = config.filePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://api.github.com/repos/${config.repository}/contents/${encodedPath}`;
}

function githubHeaders(): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${syncConfig().token}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "prospectus-developer-tools",
  };
}

async function githubError(response: Response): Promise<GitHubPromptSyncError> {
  let detail = "";
  try {
    detail = ((await response.json()) as { message?: string }).message || "";
  } catch {
    // Preserve the HTTP status when GitHub does not return JSON.
  }
  return new GitHubPromptSyncError(
    `GitHub prompt sync failed (${response.status})${detail ? `: ${detail}` : "."}`,
    response.status
  );
}

async function readGitHubDocument(): Promise<StoreSnapshot> {
  const config = syncConfig();
  const response = await fetch(
    `${githubFileUrl()}?ref=${encodeURIComponent(config.branch)}`,
    { headers: githubHeaders(), cache: "no-store" }
  );
  if (!response.ok) throw await githubError(response);
  const file = (await response.json()) as GitHubFile;
  if (file.encoding !== "base64" || typeof file.content !== "string") {
    throw new Error("GitHub returned an unsupported requirements payload.");
  }
  const document = parseDocument(
    Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8")
  );
  return {
    document,
    overrides: extractOverrides(document),
    sha: file.sha,
    sync: status("github"),
  };
}

export async function loadPromptOverrides(): Promise<StoreSnapshot> {
  if (!syncConfig().token) {
    const document = await readLocalDocument();
    return {
      document,
      overrides: extractOverrides(document),
      sync: status("local"),
    };
  }
  try {
    return await readGitHubDocument();
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub sync unavailable.";
    const document = await readLocalDocument();
    return {
      document,
      overrides: extractOverrides(document),
      sync: status("local", message),
    };
  }
}

function assertWritableConfig(): void {
  if (!syncConfig().token) {
    throw new Error(
      "GitHub prompt sync is not configured. Set GITHUB_PROMPT_TOKEN on the server."
    );
  }
}

export function promptSyncConfigured(): boolean {
  return Boolean(syncConfig().token);
}

export async function loadRuntimePromptRequirements(): Promise<string | null> {
  if (!promptSyncConfigured()) return null;
  const current = await readGitHubDocument();
  return `${JSON.stringify(current.document, null, 2)}\n`;
}

function validateRequirements(requirements: string): void {
  if (!requirements.trim()) throw new Error("Section requirements cannot be empty.");
  if (requirements.length > 100_000) {
    throw new Error("Section requirements exceed the 100,000 character limit.");
  }
}

async function writeGitHubDocument(
  document: RequirementsStore,
  sha: string | undefined,
  message: string
): Promise<{ commitSha?: string; commitUrl?: string }> {
  const config = syncConfig();
  const content = Buffer.from(
    `${JSON.stringify(document, null, 2)}\n`,
    "utf8"
  ).toString("base64");
  const response = await fetch(githubFileUrl(), {
    method: "PUT",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content,
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw await githubError(response);
  const result = (await response.json()) as GitHubWriteResponse;
  return {
    commitSha: result.commit?.sha,
    commitUrl: result.commit?.html_url,
  };
}

function isConflict(error: unknown): boolean {
  return error instanceof GitHubPromptSyncError && error.httpStatus === 409;
}

export async function savePromptOverride(
  id: string,
  requirements: string,
  source: DeveloperPromptOverride["source"]
): Promise<{ override: DeveloperPromptOverride; sync: DeveloperPromptSyncStatus }> {
  assertWritableConfig();
  validateRequirements(requirements);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readGitHubDocument();
    const entry = current.document[id];
    if (!entry) throw new Error(`Unknown prompt id: ${id}`);
    const updatedAt = new Date().toISOString();
    const document: RequirementsStore = {
      ...current.document,
      [id]: {
        ...entry,
        developer_compiled_override: requirements,
        developer_updated_at: updatedAt,
        developer_source: source,
      },
    };
    try {
      const commit = await writeGitHubDocument(
        document,
        current.sha,
        `chore(prompts): update ${id} requirements from Developer Tools`
      );
      const verified = await readGitHubDocument();
      const saved = verified.overrides[id];
      if (
        !saved ||
        saved.requirements !== requirements ||
        saved.source !== source ||
        saved.updatedAt !== updatedAt
      ) {
        throw new Error("GitHub write completed, but read-after-write verification did not match.");
      }
      const verifiedAt = new Date().toISOString();
      return {
        override: {
          ...saved,
          commitSha: commit.commitSha,
          commitUrl: commit.commitUrl,
        },
        sync: status("github", undefined, verifiedAt),
      };
    } catch (error) {
      if (attempt === 0 && isConflict(error)) continue;
      throw error;
    }
  }
  throw new Error("GitHub prompt sync conflict could not be resolved.");
}

export async function removePromptOverride(
  id: string
): Promise<{ removed: boolean; sync: DeveloperPromptSyncStatus }> {
  assertWritableConfig();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readGitHubDocument();
    const entry = current.document[id];
    if (!entry) throw new Error(`Unknown prompt id: ${id}`);
    if (typeof entry.developer_compiled_override !== "string") {
      return {
        removed: false,
        sync: status("github", undefined, new Date().toISOString()),
      };
    }
    const restored: RequirementsEntry = { ...entry };
    delete restored.developer_compiled_override;
    delete restored.developer_updated_at;
    delete restored.developer_source;
    try {
      await writeGitHubDocument(
        { ...current.document, [id]: restored },
        current.sha,
        `chore(prompts): reset ${id} requirements from Developer Tools`
      );
      const verified = await readGitHubDocument();
      if (verified.overrides[id]) {
        throw new Error("GitHub reset completed, but read-after-write verification still found an override.");
      }
      return {
        removed: true,
        sync: status("github", undefined, new Date().toISOString()),
      };
    } catch (error) {
      if (attempt === 0 && isConflict(error)) continue;
      throw error;
    }
  }
  throw new Error("GitHub prompt reset conflict could not be resolved.");
}
