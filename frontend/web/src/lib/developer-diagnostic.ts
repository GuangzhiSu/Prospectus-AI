import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import * as XLSX from "xlsx";

import staticCatalog from "@/generated/ipo-diagnostic-catalog.json";
import type {
  DiagnosticCatalog,
  DiagnosticGate,
  DiagnosticGatePatch,
  DiagnosticSourceDoc,
  DiagnosticTrace,
} from "@/lib/developer-tools-types";
import { getEligibilityPackageRoot } from "@/lib/eligibility-paths";
import { getAiModuleRoot, getProspectusRoot } from "@/lib/prospectus-root";
import {
  formatPythonProcessError,
  resolvePythonCommand,
  spawnPython,
} from "@/lib/python-runtime";

const FIXTURES: Record<string, string> = {
  synthetic_issuer: "eligibility/eligibility/tests/fixtures/synthetic_issuer.json",
  synthetic_ashare: "eligibility/eligibility/tests/fixtures/synthetic_ashare.json",
  synthetic_sgx: "eligibility/eligibility/tests/fixtures/synthetic_sgx.json",
};

function usesStaticRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.DIAGNOSTIC_FORCE_STATIC === "1";
}

function staticDiagnosticCatalog(): DiagnosticCatalog {
  const catalog = JSON.parse(JSON.stringify(staticCatalog)) as DiagnosticCatalog;
  catalog.runtime = {
    mode: "snapshot",
    readOnly: true,
    traceAvailable: false,
    message:
      "生产环境正在使用随代码发布的规则快照。规则、源文档和字段映射可正常浏览；YAML 写入和完整硬引擎归因只在本地 Python 运行时开放。",
  };
  return catalog;
}

function pythonEnv(root: string): NodeJS.ProcessEnv {
  const eligibilityRoot = getEligibilityPackageRoot(root);
  const aiModuleRoot = getAiModuleRoot(root);
  return {
    ...process.env,
    PROSPECTUS_ROOT: root,
    AI_MODULE_ROOT: aiModuleRoot,
    PYTHONPATH: [
      path.join(root, ".python_packages"),
      eligibilityRoot,
      aiModuleRoot,
      process.env.PYTHONPATH || "",
    ]
      .filter(Boolean)
      .join(path.delimiter),
  };
}

async function runDevtools(
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const root = getProspectusRoot();
  const resolution = await resolvePythonCommand(root);
  if (!resolution.ok) {
    throw new Error(resolution.error);
  }
  return new Promise((resolve, reject) => {
    const proc = spawnPython(resolution.python, ["-m", "eligibility.devtools", ...args], {
      cwd: root,
      env: pythonEnv(root),
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      reject(new Error("IPO Diagnostic catalog timed out."));
    }, 30_000);
    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          formatPythonProcessError(stderr || stdout || `eligibility.devtools exited ${code}`)
        )
      );
    });
  });
}

function parseJson<T>(raw: string): T {
  const text = raw.trim();
  const start = text.indexOf("{");
  if (start < 0) throw new Error("Developer diagnostic returned no JSON.");
  return JSON.parse(text.slice(start)) as T;
}

async function enrichWorkbook(catalog: DiagnosticCatalog): Promise<DiagnosticCatalog> {
  const root = getProspectusRoot();
  const xlsxPath = path.join(root, "update", "update", "INPUT_AND_ELIGIBILITY_MASTER_EN.xlsx");
  try {
    const buffer = await fs.readFile(xlsxPath);
    const book = XLSX.read(buffer, { type: "buffer" });
    const sheets = book.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1 }).length,
    }));
    catalog.sourceDocs = catalog.sourceDocs.map((doc) =>
      doc.id === "xlsx"
        ? {
            ...doc,
            exists: true,
            sheets,
            note:
              doc.note +
              (sheets.length
                ? ` 当前工作簿工作表：${sheets.map((sheet) => `${sheet.name}（${sheet.rows} 行）`).join("、")}。`
                : ""),
          }
        : doc
    );
    catalog.workbook.xlsxPresent = true;
    catalog.summary.xlsxPresent = true;
  } catch {
    // CSV snapshot remains the committed source of truth when Excel is absent.
  }
  return catalog;
}

export async function loadDiagnosticCatalog(): Promise<DiagnosticCatalog> {
  if (usesStaticRuntime()) {
    return enrichWorkbook(staticDiagnosticCatalog());
  }
  try {
    const { stdout } = await runDevtools(["catalog"]);
    const catalog = parseJson<DiagnosticCatalog>(stdout);
    catalog.runtime = {
      mode: "live",
      readOnly: false,
      traceAvailable: true,
      message: "当前使用本地 Python 硬引擎；规则修改和完整归因实验均可用。",
    };
    return enrichWorkbook(catalog);
  } catch {
    return enrichWorkbook(staticDiagnosticCatalog());
  }
}

export async function patchDiagnosticGate(
  patch: DiagnosticGatePatch
): Promise<{ gate: DiagnosticGate; path: string; sourceFile: string }> {
  if (usesStaticRuntime()) {
    throw new Error(
      "Vercel 生产环境为只读规则快照，不能持久化修改 YAML。请在本地 Developer Tools 中修改并通过 Git 提交。"
    );
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ipo-diag-"));
  const updatesPath = path.join(tempDir, "updates.json");
  try {
    await fs.writeFile(updatesPath, JSON.stringify(patch), "utf8");
    const { stdout } = await runDevtools([
      "patch",
      "--file",
      patch.sourceFile,
      "--gate",
      patch.gateId,
      "--updates",
      updatesPath,
    ]);
    const result = parseJson<{
      ok: boolean;
      sourceFile: string;
      path: string;
      gate: DiagnosticGate;
    }>(stdout);
    return result;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function traceDiagnostic(input: {
  issuer?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  marketKey?: string;
  rulesetNames?: string[];
  fixture?: string;
}): Promise<DiagnosticTrace> {
  if (usesStaticRuntime()) {
    throw new Error(
      "Vercel 生产环境没有 Python 硬引擎。规则标准与字段映射仍可浏览；完整归因实验请在本地 Developer Tools 中运行。"
    );
  }
  const root = getProspectusRoot();
  let issuer = input.issuer;
  if (!issuer && input.fixture) {
    const relative = FIXTURES[input.fixture];
    if (!relative) throw new Error("Unknown diagnostic fixture.");
    const raw = await fs.readFile(path.join(root, relative), "utf8");
    issuer = JSON.parse(raw) as Record<string, unknown>;
  }
  if (!issuer || typeof issuer !== "object") {
    throw new Error("Provide issuer JSON or a built-in fixture.");
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ipo-diag-"));
  const issuerPath = path.join(tempDir, "issuer.json");
  const profilePath = path.join(tempDir, "profile.json");
  try {
    await fs.writeFile(issuerPath, JSON.stringify(issuer), "utf8");
    const args = ["trace", "--issuer", issuerPath];
    if (input.profile) {
      await fs.writeFile(profilePath, JSON.stringify(input.profile), "utf8");
      args.push("--profile", profilePath);
    }
    if (input.marketKey) args.push("--market", input.marketKey);
    for (const name of input.rulesetNames || []) args.push("--ruleset", name);
    const { stdout } = await runDevtools(args);
    return parseJson<DiagnosticTrace>(stdout);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function diagnosticFixtures(): Array<{ id: string; label: string }> {
  return [
    { id: "synthetic_issuer", label: "合成港股夹具（synthetic_issuer）" },
    { id: "synthetic_ashare", label: "合成 A 股夹具（synthetic_ashare）" },
    { id: "synthetic_sgx", label: "合成新交所夹具（synthetic_sgx）" },
  ];
}

export function findSourceDoc(
  catalog: DiagnosticCatalog,
  id: string
): DiagnosticSourceDoc | undefined {
  return catalog.sourceDocs.find((doc) => doc.id === id);
}
