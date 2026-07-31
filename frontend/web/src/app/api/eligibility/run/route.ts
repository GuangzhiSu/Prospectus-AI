// POST /api/eligibility/run — spawn eligibility bridge with drafting LLM settings
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import {
  getAiModuleRoot,
  getProspectusRoot,
  workspacePaths,
} from "@/lib/prospectus-root";
import { getEligibilityPackageRoot } from "@/lib/eligibility-paths";
import { readEligibilitySettings, buildAgentProcessEnv } from "@/lib/app-settings";
import {
  formatPythonProcessError,
  resolvePythonCommand,
  spawnPython,
} from "@/lib/python-runtime";

export const runtime = "nodejs";
export const maxDuration = 300;

type RunBody = {
  sessionId?: string;
  market_key?: string;
  market_hint?: string;
  ruleset_names?: string[];
  auto_confirm?: boolean;
  confirmed_ids?: string[];
  rejected_ids?: string[];
  include_feedback?: boolean;
  structured_form?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  issuer?: Record<string, unknown>;
  use_uploaded_docs?: boolean;
};

type FallbackStatus =
  | "PASS"
  | "SHORTFALL"
  | "MISSING_INPUT"
  | "INDETERMINATE"
  | "NOT_EVALUATED";

type FallbackCheck = {
  check_id: string;
  metric: string;
  status: FallbackStatus;
  rule_ref: string;
  operator?: string;
  required?: string;
  actual: unknown;
  note?: string;
};

type FallbackGate = {
  gate_id: string;
  title: string;
  rule_ref: string;
  ruleset: string;
  evaluated: boolean;
  status: FallbackStatus;
  verdict: null;
  note?: string;
  checks: FallbackCheck[];
};

function providerReady(
  provider: string,
  env: NodeJS.ProcessEnv
): { ready: boolean; reason?: string } {
  if (provider === "qwen_local") return { ready: true };
  if (provider === "anthropic") {
    return env.ANTHROPIC_API_KEY
      ? { ready: true }
      : { ready: false, reason: "No Anthropic API key saved in Settings." };
  }
  if (provider === "deepseek") {
    return env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY
      ? { ready: true }
      : { ready: false, reason: "No DeepSeek API key saved in Settings." };
  }
  if (provider === "qwen_api") {
    return env.DASHSCOPE_API_KEY || env.OPENAI_API_KEY
      ? { ready: true }
      : { ready: false, reason: "No DashScope API key saved in Settings." };
  }
  if (provider === "openai") {
    return env.OPENAI_API_KEY
      ? { ready: true }
      : { ready: false, reason: "No OpenAI API key saved in Settings." };
  }
  return { ready: false, reason: `Unknown provider: ${provider}` };
}

function numberField(form: Record<string, unknown>, key: string): number | null {
  const raw = form[key];
  if (raw === undefined || raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function stringField(form: Record<string, unknown>, key: string): string {
  const raw = form[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function minimumCheck(
  form: Record<string, unknown>,
  key: string,
  checkId: string,
  metric: string,
  threshold: number,
  unit: string,
  ruleRef: string
): FallbackCheck {
  const value = numberField(form, key);
  if (value === null) {
    return {
      check_id: checkId,
      metric,
      status: "MISSING_INPUT",
      rule_ref: ruleRef,
      operator: ">=",
      required: `>= ${threshold} ${unit}`,
      actual: null,
      note: `${key} was not supplied in the structured form.`,
    };
  }
  return {
    check_id: checkId,
    metric,
    status: value >= threshold ? "PASS" : "SHORTFALL",
    rule_ref: ruleRef,
    operator: ">=",
    required: `>= ${threshold} ${unit}`,
    actual: `${value} ${unit}`,
  };
}

function booleanYesCheck(
  form: Record<string, unknown>,
  key: string,
  checkId: string,
  metric: string,
  ruleRef: string
): FallbackCheck {
  const value = stringField(form, key).toLowerCase();
  if (!value || value === "unknown") {
    return {
      check_id: checkId,
      metric,
      status: "MISSING_INPUT",
      rule_ref: ruleRef,
      operator: "is_true",
      required: "yes / confirmed",
      actual: value || null,
      note: `${key} was not confirmed in the structured form.`,
    };
  }
  return {
    check_id: checkId,
    metric,
    status: value === "yes" ? "PASS" : "SHORTFALL",
    rule_ref: ruleRef,
    operator: "is_true",
    required: "yes / confirmed",
    actual: value,
  };
}

function statusFromChecks(checks: FallbackCheck[]): FallbackStatus {
  if (!checks.length) return "NOT_EVALUATED";
  if (checks.some((check) => check.status === "SHORTFALL")) return "SHORTFALL";
  if (checks.some((check) => check.status === "INDETERMINATE")) return "INDETERMINATE";
  if (checks.some((check) => check.status === "MISSING_INPUT")) return "MISSING_INPUT";
  if (checks.every((check) => check.status === "PASS")) return "PASS";
  return "NOT_EVALUATED";
}

function gate(
  ruleset: string,
  gateId: string,
  title: string,
  ruleRef: string,
  checks: FallbackCheck[],
  note?: string
): FallbackGate {
  return {
    gate_id: gateId,
    title,
    rule_ref: ruleRef,
    ruleset,
    evaluated: true,
    status: statusFromChecks(checks),
    verdict: null,
    note,
    checks,
  };
}

function notEvaluatedGate(
  ruleset: string,
  gateId: string,
  title: string,
  ruleRef: string,
  note: string
): FallbackGate {
  return {
    gate_id: gateId,
    title,
    rule_ref: ruleRef,
    ruleset,
    evaluated: false,
    status: "NOT_EVALUATED",
    verdict: null,
    note,
    checks: [
      {
        check_id: `${gateId}_deferred`,
        metric: title,
        status: "NOT_EVALUATED",
        rule_ref: ruleRef,
        actual: null,
        note,
      },
    ],
  };
}

function hkexMainBoardFallbackGates(form: Record<string, unknown>): FallbackGate[] {
  const ruleset = "HKEX_Main_Board";
  return [
    gate(
      ruleset,
      "mb_8051_profit_test",
      "Profit test",
      "Main Board Listing Rule 8.05(1)",
      [
        minimumCheck(
          form,
          "latest_profit",
          "profit_recent_year",
          "Profit attributable to owners, most recent audited year",
          35,
          "HKD million",
          "Main Board Listing Rule 8.05(1)"
        ),
        minimumCheck(
          form,
          "preceding_two_year_profit",
          "profit_two_preceding_years",
          "Aggregate profit attributable to owners, two preceding years",
          45,
          "HKD million",
          "Main Board Listing Rule 8.05(1)"
        ),
        minimumCheck(
          form,
          "track_record_profit",
          "profit_three_year_aggregate",
          "Aggregate profit attributable to owners, track record period",
          80,
          "HKD million",
          "Main Board Listing Rule 8.05(1)"
        ),
        minimumCheck(
          form,
          "market_cap",
          "market_cap_at_listing",
          "Expected market capitalisation at listing",
          500,
          "HKD million",
          "Main Board Listing Rule 8.05(1); Rule 8.09(2)"
        ),
      ]
    ),
    gate(
      ruleset,
      "mb_8052_market_cap_revenue_cashflow_test",
      "Market capitalisation / revenue / cash flow test",
      "Main Board Listing Rule 8.05(2)",
      [
        minimumCheck(
          form,
          "market_cap",
          "market_cap_at_listing",
          "Expected market capitalisation at listing",
          2000,
          "HKD million",
          "Main Board Listing Rule 8.05(2)"
        ),
        minimumCheck(
          form,
          "latest_revenue",
          "revenue_recent_year",
          "Revenue, most recent audited financial year",
          500,
          "HKD million",
          "Main Board Listing Rule 8.05(2)"
        ),
        minimumCheck(
          form,
          "operating_cashflow",
          "operating_cashflow_track_record",
          "Aggregate operating cash flow, track record period",
          100,
          "HKD million",
          "Main Board Listing Rule 8.05(2)"
        ),
      ]
    ),
    gate(
      ruleset,
      "mb_8053_market_cap_revenue_test",
      "Market capitalisation / revenue test",
      "Main Board Listing Rule 8.05(3)",
      [
        minimumCheck(
          form,
          "market_cap",
          "market_cap_at_listing",
          "Expected market capitalisation at listing",
          4000,
          "HKD million",
          "Main Board Listing Rule 8.05(3)"
        ),
        minimumCheck(
          form,
          "latest_revenue",
          "revenue_recent_year",
          "Revenue, most recent audited financial year",
          500,
          "HKD million",
          "Main Board Listing Rule 8.05(3)"
        ),
      ]
    ),
    gate(
      ruleset,
      "mb_management_continuity",
      "Management continuity",
      "Main Board Listing Rule 8.05(1)(b) / 8.05(2)(b) / 8.05(3)(b)",
      [
        minimumCheck(
          form,
          "management_continuity_years",
          "management_continuity_years",
          "Years of management continuity",
          3,
          "financial years",
          "Main Board Listing Rule 8.05"
        ),
      ]
    ),
    gate(
      ruleset,
      "mb_ownership_continuity",
      "Ownership continuity and control",
      "Main Board Listing Rule 8.05(2)(c) / 8.05(3)(c)",
      [
        booleanYesCheck(
          form,
          "ownership_continuity",
          "ownership_continuity_recent_fy",
          "Ownership continuity for the relevant recent audited period",
          "Main Board Listing Rule 8.05"
        ),
      ]
    ),
    notEvaluatedGate(
      "HKEX_Public_Float",
      "hkex_public_float",
      "Public float / shareholder spread",
      "Main Board Listing Rule 8.08",
      "The public Vercel fallback does not evaluate shareholder-spread or allocation mechanics. Run the full eligibility engine locally or provide a verified issuer JSON for final hard-rule review."
    ),
  ];
}

function genericStructuredFallbackGates(
  form: Record<string, unknown>,
  marketKey: string
): FallbackGate[] {
  const ruleset = marketKey || "Structured_Form";
  const suppliedChecks: FallbackCheck[] = [
    "latest_profit",
    "latest_revenue",
    "market_cap",
    "operating_cashflow",
  ].map((key) => {
    const value = numberField(form, key);
    return {
      check_id: `${key}_supplied`,
      metric: `Structured field supplied: ${key}`,
      status: value === null ? "MISSING_INPUT" : "PASS",
      rule_ref: "Structured input completeness",
      actual: value,
      note: value === null ? `${key} was not supplied.` : undefined,
    };
  });
  return [
    gate(
      ruleset,
      "structured_input_completeness",
      "Structured input completeness",
      "Structured input completeness",
      suppliedChecks,
      "This fallback confirms which fields reached the public site."
    ),
    notEvaluatedGate(
      ruleset,
      "full_market_rules_deferred",
      "Full market-specific hard-rule pack",
      "Versioned eligibility YAML rules",
      "This production fallback avoids a Python runtime dependency on Vercel. Use the desktop/local app for the full deterministic multi-market rule engine, including currency conversion and board-specific rule limbs."
    ),
  ];
}

function statusCounts(rulesets: Array<{ gates: FallbackGate[] }>): Record<string, number> {
  const counts: Record<string, number> = {
    PASS: 0,
    SHORTFALL: 0,
    MISSING_INPUT: 0,
    INDETERMINATE: 0,
    NOT_EVALUATED: 0,
  };
  for (const block of rulesets) {
    for (const item of block.gates) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
  }
  return counts;
}

function quantifiableFields(form: Record<string, unknown>) {
  return [
    ["latest_profit", "HKD million"],
    ["preceding_two_year_profit", "HKD million"],
    ["track_record_profit", "HKD million"],
    ["latest_revenue", "HKD million"],
    ["market_cap", "HKD million"],
    ["operating_cashflow", "HKD million"],
    ["management_continuity_years", "years"],
    ["wvr_ownership_pct", "%"],
  ]
    .map(([field_id, unit]) => ({
      field_id,
      value: form[field_id],
      unit,
      confirmation_status:
        form[field_id] === undefined || form[field_id] === "" ? "missing" : "confirmed",
    }))
    .filter((field) => field.value !== undefined && field.value !== "");
}

function buildFallbackFeedback(
  rulesets: Array<{ gates: FallbackGate[] }>,
  marketHint: string
) {
  const gates = rulesets.flatMap((block) => block.gates);
  const shortfalls = gates.filter((item) => item.status === "SHORTFALL");
  const missing = gates.filter((item) => item.status === "MISSING_INPUT");
  const deferred = gates.filter((item) => item.status === "NOT_EVALUATED");
  const readiness = shortfalls.length
    ? "not_ready"
    : missing.length || deferred.length
      ? "unclear_missing_inputs"
      : "ready_to_discuss";
  const gaps = [...shortfalls, ...missing, ...deferred].slice(0, 8).map((item) => ({
    area: item.title,
    severity: item.status === "SHORTFALL" ? "high" : "medium",
    detail:
      item.status === "SHORTFALL"
        ? "One or more supplied structured values fall below the encoded threshold."
        : item.status === "MISSING_INPUT"
          ? "The structured form is missing at least one required input for this check."
          : item.note || "This rule limb needs the full deterministic engine.",
    rule_ref: item.rule_ref,
    suggested_action:
      item.status === "NOT_EVALUATED"
        ? "Run the desktop/local eligibility engine or provide verified issuer JSON for this limb."
        : "Confirm the source value and update the structured form.",
  }));
  return {
    readiness,
    headline: shortfalls.length
      ? "Some supplied values fall short of the encoded screen."
      : missing.length || deferred.length
        ? "The structured screen ran, but more inputs are needed."
        : "The supplied structured values pass this fallback screen.",
    summary:
      `Structured fallback completed for ${marketHint || "the selected market"}. ` +
      "This production check is diagnostic only and uses rule-linked structured fields; full document extraction and exhaustive multi-market gates remain in the local eligibility engine.",
    strengths: gates
      .filter((item) => item.status === "PASS")
      .slice(0, 6)
      .map((item) => item.title),
    gaps,
    priority_actions: gaps.slice(0, 5).map((gap) => gap.suggested_action),
    disclaimer:
      "Diagnostic only. This fallback does not decide listing eligibility and is not legal advice.",
    stub: true,
    source: "vercel_structured_fallback",
  };
}

function buildStructuredFallbackResponse(
  body: RunBody,
  sessionId: string,
  reason: string
) {
  const form = body.structured_form || {};
  const marketKey = body.market_key || "structured";
  const marketHint =
    body.market_hint ||
    stringField(form, "market_hint") ||
    (typeof body.profile?.market_hint === "string" ? body.profile.market_hint : "");
  const gates =
    marketKey === "hkex_main_board"
      ? hkexMainBoardFallbackGates(form)
      : genericStructuredFallbackGates(form, marketKey);
  const rulesets = [
    {
      ruleset: marketKey === "hkex_main_board" ? "HKEX_Main_Board" : marketKey,
      ruleset_name:
        marketKey === "hkex_main_board"
          ? "HKEX Main Board financial eligibility tests"
          : `${marketHint || marketKey} structured fallback`,
      version: "vercel-fallback",
      source_ref: "Repository eligibility rules; Vercel structured fallback",
      gates,
    },
  ];
  const counts = statusCounts(rulesets);
  const report = {
    report_type: "listing_eligibility_diagnostic",
    schema: "eligibility.report.v1",
    disclaimer:
      "Diagnostic only. This public-site fallback is not legal advice and does not decide listing eligibility.",
    verdict: null,
    issuer_id: stringField(form, "issuer_name") || "structured_form",
    generated_at: new Date().toISOString(),
    as_of_date: null,
    status_legend: {
      PASS: "Value present and meets the fallback threshold.",
      SHORTFALL: "Value present but below the fallback threshold.",
      MISSING_INPUT: "Required structured value is absent.",
      INDETERMINATE: "Value present but cannot be compared.",
      NOT_EVALUATED: "Needs the full local deterministic engine.",
    },
    summary: {
      status_counts: counts,
      gates_total: rulesets.reduce((sum, block) => sum + block.gates.length, 0),
    },
    rulesets,
    soft_conditions: [],
    feedback: body.include_feedback === false ? undefined : buildFallbackFeedback(rulesets, marketHint),
    extraction: {
      quantifiable: quantifiableFields(form),
      llm_stub: true,
      notes: [reason],
    },
  };
  return {
    ok: true,
    sessionId,
    report,
    llm: {
      provider: "vercel_structured_fallback",
      stub: true,
      reason,
    },
  };
}

function canUseStructuredFallback(
  body: RunBody,
  documentPaths: string[] | undefined
): boolean {
  return Boolean(process.env.VERCEL === "1" && !documentPaths?.length && body.structured_form);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RunBody;
    const root = getProspectusRoot();
    const paths = workspacePaths(root);
    const sessionId = (body.sessionId || randomUUID().slice(0, 12)).trim();
    const sessionDir = path.join(paths.eligibility, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const docsDir = path.join(sessionDir, "docs");
    let document_paths: string[] | undefined;
    if (body.use_uploaded_docs !== false) {
      try {
        const names = await fs.readdir(docsDir);
        document_paths = names
          .filter((n) => !n.startsWith("."))
          .map((n) => path.join(docsDir, n));
        if (!document_paths.length) document_paths = undefined;
      } catch {
        document_paths = undefined;
      }
    }

    if (!document_paths && !body.structured_form && !body.issuer) {
      return NextResponse.json(
        {
          error:
            "Provide uploaded documents, a structured form, or an issuer JSON payload.",
        },
        { status: 400 }
      );
    }

    const payload = {
      document_paths,
      structured_form: body.structured_form,
      issuer: body.issuer,
      profile: body.profile || {},
      market_key: body.market_key,
      market_hint: body.market_hint,
      ruleset_names: body.ruleset_names,
      auto_confirm: body.auto_confirm ?? true,
      confirmed_ids: body.confirmed_ids,
      rejected_ids: body.rejected_ids,
      include_feedback: body.include_feedback ?? true,
    };

    const payloadPath = path.join(sessionDir, "request.json");
    const reportPath = path.join(sessionDir, "report.json");
    await fs.writeFile(payloadPath, JSON.stringify(payload, null, 2), "utf8");

    const pythonResolution = await resolvePythonCommand(root);
    if (!pythonResolution.ok) {
      if (canUseStructuredFallback(body, document_paths)) {
        return NextResponse.json(
          buildStructuredFallbackResponse(
            body,
            sessionId,
            pythonResolution.error
          )
        );
      }
      return NextResponse.json(
        { ok: false, error: pythonResolution.error },
        { status: 500 }
      );
    }

    const settings = await readEligibilitySettings();
    const env = buildAgentProcessEnv(process.env, settings);
    const eligibilityRoot = getEligibilityPackageRoot(root);
    const aiModuleRoot = getAiModuleRoot(root);
    const pythonPackagesRoot = path.join(root, ".python_packages");
    env.PYTHONPATH = [
      pythonPackagesRoot,
      eligibilityRoot,
      aiModuleRoot,
      env.PYTHONPATH || "",
    ]
      .filter(Boolean)
      .join(path.delimiter);
    env.AI_MODULE_ROOT = aiModuleRoot;
    env.PROSPECTUS_ROOT = root;
    // Eligibility prompts are shorter than prospectus drafting; keep MPS/CPU safe.
    if (!env.QWEN_MAX_CTX) env.QWEN_MAX_CTX = "4096";
    if (!env.QWEN_MAX_NEW_TOKENS) env.QWEN_MAX_NEW_TOKENS = "768";
    if (!env.QWEN_DO_SAMPLE) env.QWEN_DO_SAMPLE = "0";
    if (!env.QWEN_ENABLE_THINKING) env.QWEN_ENABLE_THINKING = "0";

    // Same provider as drafting Settings. Only force stub when the selected
    // cloud provider has no credentials; Local Qwen always attempts live load.
    const provider = String(env.LLM_PROVIDER || settings.llmProvider || "qwen_local");
    const readiness =
      process.env.VERCEL === "1" && provider === "qwen_local"
        ? {
            ready: false,
            reason:
              "Local Qwen is not available in Vercel serverless; using structured fallback.",
          }
        : providerReady(provider, env);
    if (env.ELIGIBILITY_LLM_STUB === undefined || env.ELIGIBILITY_LLM_STUB === "") {
      env.ELIGIBILITY_LLM_STUB = readiness.ready ? "0" : "1";
    }

    const result = await new Promise<{
      ok: boolean;
      code: number | null;
      stdout: string;
      stderr: string;
      timedOut?: boolean;
    }>((resolve) => {
      const proc = spawnPython(
        pythonResolution.python,
        ["-m", "eligibility.bridge", "--in", payloadPath, "--out", reportPath],
        { cwd: root, env }
      );
      let stdout = "";
      let stderr = "";
      let settled = false;
      const timeoutMs = Number(
        process.env.ELIGIBILITY_RUN_TIMEOUT_MS ||
          (provider === "qwen_local" ? 20 * 60 * 1000 : 8 * 60 * 1000)
      );
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          proc.kill("SIGTERM");
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          try {
            proc.kill("SIGKILL");
          } catch {
            /* ignore */
          }
        }, 4000);
        resolve({
          ok: false,
          code: null,
          stdout,
          stderr:
            stderr +
            `\nTimed out after ${Math.round(timeoutMs / 1000)}s while running the eligibility bridge.` +
            (provider === "qwen_local"
              ? " Local Qwen may still be loading, or the run is blocked on network/proxy access to Hugging Face. Prefer a cloud API in Eligibility Settings, or confirm the local model folder is complete."
              : " Try again, or switch provider in Eligibility Settings."),
          timedOut: true,
        });
      }, timeoutMs);
      const finish = (payload: {
        ok: boolean;
        code: number | null;
        stdout: string;
        stderr: string;
        timedOut?: boolean;
      }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(payload);
      };
      proc.stdout?.on("data", (d) => {
        stdout += d.toString();
      });
      proc.stderr?.on("data", (d) => {
        stderr += d.toString();
      });
      proc.on("close", (code) =>
        finish({ ok: code === 0, code, stdout, stderr })
      );
      proc.on("error", (err) =>
        finish({ ok: false, code: null, stdout: "", stderr: err.message })
      );
    });

    if (!result.ok) {
      if (canUseStructuredFallback(body, document_paths)) {
        return NextResponse.json(
          buildStructuredFallbackResponse(
            body,
            sessionId,
            formatPythonProcessError(
              result.stderr || result.stdout || `Exit code ${result.code}`
            )
          )
        );
      }
      return NextResponse.json(
        {
          ok: false,
          sessionId,
          error: formatPythonProcessError(
            result.stderr || result.stdout || `Exit code ${result.code}`
          ),
          timedOut: Boolean(result.timedOut),
          llm: {
            provider,
            stub: env.ELIGIBILITY_LLM_STUB === "1",
            model: env.AGENT1_MODEL,
            reason: readiness.reason,
          },
        },
        { status: result.timedOut ? 504 : 500 }
      );
    }

    const reportRaw = await fs.readFile(reportPath, "utf8");
    const report = JSON.parse(reportRaw);
    return NextResponse.json({
      ok: true,
      sessionId,
      report,
      llm: report.llm || {
        provider,
        stub: env.ELIGIBILITY_LLM_STUB === "1",
        reason: readiness.reason,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
