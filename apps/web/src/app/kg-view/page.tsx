import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";

import { getProspectusRoot } from "@/lib/prospectus-root";

type Node = {
  id: string;
  graph_layer?: string;
  node_type?: string;
  canonical_name?: string;
  mandatory?: boolean;
  typical_order_index?: number;
  canonical_section_id?: string;
  document_id?: string;
  raw_title?: string;
  page_start?: number;
  page_end?: number;
  order_index?: number;
  source_file?: string;
};

type EdgeWrap = {
  edge?: {
    source_id?: string;
    target_id?: string;
    edge_type?: string;
    metadata?: { confidence?: number; support_count?: number };
  };
};

type Graph = { nodes: Node[]; edges: EdgeWrap[] };

type SectionCard = {
  section_id: string;
  function?: string;
  purpose?: string;
  typical_structure?: Array<{ subsection?: string; description?: string } | string>;
  writing_rules?: Array<string | { rule?: string; text?: string }>;
  required_input_fields?: Array<string | { field?: string; name?: string }>;
  common_pitfalls?: Array<string | { pitfall?: string; text?: string }>;
};

function kgOutputDir() {
  return path.join(getProspectusRoot(), "prospectus_kg_output");
}

function KgExplorerMissing({ docgraphPath }: { docgraphPath: string }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[720px] px-6 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Knowledge Graph explorer</h1>
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          This view needs a full internal knowledge-graph export at{" "}
          <code className="text-xs">{docgraphPath}</code> (and optional{" "}
          <code className="text-xs">writing/section_cards/</code>). Consumer / installer builds only
          ship the slim crosswalk files under <code className="text-xs">prospectus_kg_output/inputs/</code>{" "}
          for drafting — not corpus graphs or <code className="text-xs">native_docs</code>.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Use the main workspace to run Agent1 → Agent2; the graph tree is for development and QA.
        </p>
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          ← Back to drafting workspace
        </Link>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

// Mirror of prospectus_graph.crosswalk.AGENT2_TO_SCHEMA_B. Kept in sync manually:
// every key here is an ontology / Agent2 section id; the value is the Schema B
// crosswalk key (`input_schema_crosswalk.json` > sections).
const AGENT2_TO_SCHEMA_B: Record<string, string> = {
  ExpectedTimetable: "Expected_Timetable",
  Contents: "Contents",
  Summary: "Summary",
  Definitions: "Definitions",
  Glossary: "Glossary_of_Technical_Terms",
  ForwardLooking: "Forward_Looking_Statements",
  RiskFactors: "Risk_Factors",
  Waivers: "Waivers_and_Exemptions",
  InfoProspectus: "Prospectus_and_Global_Offering_Information",
  DirectorsParties: "Parties_Involved_in_the_Global_Offering",
  CorporateInfo: "Corporate_Information",
  Regulation: "Regulatory_Overview",
  IndustryOverview: "Industry_Overview",
  HistoryReorg: "History_Reorganization_Corporate_Structure",
  Business: "Business",
  ContractualArrangements: "Contractual_Arrangements_VIE",
  ControllingShareholders: "Relationship_with_Controlling_Shareholders",
  ConnectedTransactions: "Connected_Transactions",
  DirectorsSeniorMgmt: "Directors_and_Senior_Management",
  SubstantialShareholders: "Substantial_Shareholders",
  ShareCapital: "Share_Capital",
  FinancialInfo: "Financial_Information",
  UseOfProceeds: "Future_Plans_and_Use_of_Proceeds",
  Underwriting: "Underwriting",
  GlobalOfferingStructure: "Structure_of_the_Global_Offering",
};

type CrosswalkSection = {
  report_anchor?: string;
  gating_documents?: string[];
  deliverables?: string[];
};

type Crosswalk = {
  schema_name?: string;
  sections: Record<string, CrosswalkSection>;
};

type CoverageHeader = {
  totalBullets: number;
  covered: number;
  gap: number;
  pct: string;
};

function normalizeStringList(xs?: Array<string | Record<string, unknown>>): string[] {
  if (!xs) return [];
  return xs
    .map((x) => {
      if (typeof x === "string") return x;
      const r = x as Record<string, unknown>;
      const v =
        r.rule || r.text || r.pitfall || r.field || r.name || r.subsection || r.description;
      return typeof v === "string" ? v : "";
    })
    .filter(Boolean) as string[];
}

export default async function KgViewPage() {
  const base = kgOutputDir();
  const docgraphPath = path.join(base, "structure", "docgraph.json");
  let graph: Graph;
  try {
    const raw = await fs.readFile(docgraphPath, "utf-8");
    graph = JSON.parse(raw) as Graph;
  } catch {
    return <KgExplorerMissing docgraphPath={docgraphPath} />;
  }

  const ontology = graph.nodes
    .filter((n) => n.graph_layer === "ontology")
    .sort((a, b) => (a.typical_order_index ?? 999) - (b.typical_order_index ?? 999));

  const docNodes = graph.nodes.filter((n) => n.node_type === "DocumentNode");
  const sectionInstances = graph.nodes.filter((n) => n.node_type === "DocumentSectionInstance");

  const instancesByDoc = new Map<string, Node[]>();
  const instanceCountBySection = new Map<string, number>();
  for (const n of sectionInstances) {
    if (n.document_id) {
      const arr = instancesByDoc.get(n.document_id) ?? [];
      arr.push(n);
      instancesByDoc.set(n.document_id, arr);
    }
    if (n.canonical_section_id) {
      instanceCountBySection.set(
        n.canonical_section_id,
        (instanceCountBySection.get(n.canonical_section_id) ?? 0) + 1,
      );
    }
  }
  for (const arr of instancesByDoc.values()) {
    arr.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  const cardsDir = path.join(base, "writing", "section_cards");
  const cards = new Map<string, SectionCard>();
  for (const n of ontology) {
    try {
      const s = JSON.parse(
        await fs.readFile(path.join(cardsDir, `${n.id}.json`), "utf-8"),
      ) as SectionCard;
      cards.set(n.id, s);
    } catch {
      // ignore missing card
    }
  }

  const totals = {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    sectionTypes: ontology.length,
    docs: docNodes.length,
    instances: sectionInstances.length,
  };

  // ---------- Crosswalk + Report-coverage data (Report §5 / §6) ----------
  let crosswalk: Crosswalk | null = null;
  try {
    crosswalk = JSON.parse(
      await fs.readFile(
        path.join(base, "inputs", "input_schema_crosswalk.json"),
        "utf-8",
      ),
    ) as Crosswalk;
  } catch {
    crosswalk = null;
  }

  let coverageHeader: CoverageHeader | null = null;
  try {
    const md = await fs.readFile(
      path.join(base, "inputs", "_coverage_vs_report.md"),
      "utf-8",
    );
    // Parse the "**Total** | **132** | **132** | **0** | **100%**" row.
    const m = md.match(/\*\*Total\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*([\d.]+%)\*\*/);
    if (m) {
      coverageHeader = {
        totalBullets: Number(m[1]),
        covered: Number(m[2]),
        gap: Number(m[3]),
        pct: m[4],
      };
    }
  } catch {
    coverageHeader = null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">Knowledge Graph — Tree View</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Source: <code>prospectus_kg_output/structure/docgraph.json</code> · Click any row to
            expand.
          </p>
          <div className="mt-2">
            <Link href="/" className="text-xs text-[var(--accent)] hover:underline">
              ← Back to drafting workspace
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Total nodes" value={totals.nodes} />
          <Stat label="Total edges" value={totals.edges} />
          <Stat label="Section types" value={totals.sectionTypes} />
          <Stat label="Prospectus docs" value={totals.docs} />
          <Stat label="Section instances" value={totals.instances} />
          <Stat
            label="Report coverage"
            valueText={coverageHeader ? coverageHeader.pct : "n/a"}
            sublabel={
              coverageHeader
                ? `${coverageHeader.covered}/${coverageHeader.totalBullets} bullets`
                : "_coverage_vs_report.md not found"
            }
          />
        </div>

        {/* Tree-table: 4 columns via CSS grid */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <HeaderRow />

          {/* ROOT */}
          <TreeRow
            depth={0}
            defaultOpen
            name="Prospectus Knowledge Graph"
            type="Root"
            count={totals.nodes}
            detail={`${totals.sectionTypes} section types · ${totals.docs} documents · ${totals.instances} section instances`}
          >
            {/* ONTOLOGY BRANCH */}
            <TreeRow
              depth={1}
              defaultOpen
              name="Ontology layer"
              type="Layer"
              count={totals.sectionTypes}
              detail="Canonical HKEX section types mined from the corpus"
            >
              {ontology.map((n) => {
                const card = cards.get(n.id);
                const ts = (card?.typical_structure ?? []).map((x) =>
                  typeof x === "string"
                    ? { subsection: x, description: "" }
                    : { subsection: x.subsection ?? "", description: x.description ?? "" },
                );
                const rules = normalizeStringList(card?.writing_rules);
                const inputs = normalizeStringList(card?.required_input_fields);
                const pitfalls = normalizeStringList(card?.common_pitfalls);
                const coverage = instanceCountBySection.get(n.id) ?? 0;
                const coveragePct = totals.docs
                  ? ((coverage / totals.docs) * 100).toFixed(0)
                  : "0";

                const bKey = AGENT2_TO_SCHEMA_B[n.id];
                const cwEntry = bKey ? crosswalk?.sections?.[bKey] : undefined;
                const gatingCount = cwEntry?.gating_documents?.length ?? 0;
                const deliverableCount = cwEntry?.deliverables?.length ?? 0;
                const anchor = cwEntry?.report_anchor || "";
                const reportCoverageLabel = cwEntry
                  ? `${anchor || "§5"} · ${gatingCount} gating + ${deliverableCount} deliverable`
                  : bKey
                  ? "no crosswalk entry"
                  : "not mapped";

                return (
                  <TreeRow
                    key={n.id}
                    depth={2}
                    name={n.canonical_name || n.id}
                    type={n.mandatory ? "Required" : "Optional"}
                    typeTone={n.mandatory ? "accent" : "muted"}
                    count={coverage}
                    reportCoverage={reportCoverageLabel}
                    detail={`order #${n.typical_order_index ?? "?"} · ${coveragePct}% corpus coverage`}
                  >
                    {card?.function && (
                      <LeafRow
                        depth={3}
                        label="Function"
                        value={card.function}
                      />
                    )}
                    {card?.purpose && (
                      <LeafRow
                        depth={3}
                        label="Purpose"
                        value={card.purpose}
                      />
                    )}

                    {ts.length > 0 && (
                      <TreeRow
                        depth={3}
                        name="Typical structure"
                        type="List"
                        count={ts.length}
                      >
                        {ts.map((s, i) => (
                          <LeafRow
                            key={i}
                            depth={4}
                            label={s.subsection || `item ${i + 1}`}
                            value={s.description || ""}
                          />
                        ))}
                      </TreeRow>
                    )}

                    {rules.length > 0 && (
                      <TreeRow
                        depth={3}
                        name="Writing rules"
                        type="List"
                        count={rules.length}
                      >
                        {rules.map((r, i) => (
                          <LeafRow key={i} depth={4} label={`rule ${i + 1}`} value={r} />
                        ))}
                      </TreeRow>
                    )}

                    {inputs.length > 0 && (
                      <TreeRow
                        depth={3}
                        name="Required input fields"
                        type="List"
                        count={inputs.length}
                      >
                        {inputs.map((f, i) => (
                          <LeafRow
                            key={i}
                            depth={4}
                            label={f}
                            value=""
                            mono
                          />
                        ))}
                      </TreeRow>
                    )}

                    {pitfalls.length > 0 && (
                      <TreeRow
                        depth={3}
                        name="Common pitfalls"
                        type="List"
                        count={pitfalls.length}
                      >
                        {pitfalls.map((p, i) => (
                          <LeafRow key={i} depth={4} label={`pitfall ${i + 1}`} value={p} />
                        ))}
                      </TreeRow>
                    )}

                    {cwEntry ? (
                      <TreeRow
                        depth={3}
                        name={`Report ${anchor || "§5"} — gating docs & deliverables`}
                        type="Report"
                        count={gatingCount + deliverableCount}
                      >
                        {(cwEntry.gating_documents ?? []).map((fid) => (
                          <LeafRow
                            key={`g-${fid}`}
                            depth={4}
                            label={fid}
                            value="gating document"
                            mono
                          />
                        ))}
                        {(cwEntry.deliverables ?? []).map((fid) => (
                          <LeafRow
                            key={`d-${fid}`}
                            depth={4}
                            label={fid}
                            value="professional deliverable"
                            mono
                          />
                        ))}
                      </TreeRow>
                    ) : null}
                  </TreeRow>
                );
              })}
            </TreeRow>

            {/* DOCUMENT BRANCH */}
            <TreeRow
              depth={1}
              name="Document layer"
              type="Layer"
              count={totals.docs}
              detail="Every parsed HKEX prospectus and the sections it contains"
            >
              {docNodes
                .slice()
                .sort((a, b) => (a.document_id ?? "").localeCompare(b.document_id ?? ""))
                .map((d) => {
                  const sections = instancesByDoc.get(d.document_id ?? "") ?? [];
                  return (
                    <TreeRow
                      key={d.id}
                      depth={2}
                      name={d.document_id || d.id}
                      type="Document"
                      count={sections.length}
                      detail={d.source_file || ""}
                    >
                      {sections.map((s) => (
                        <LeafRow
                          key={s.id}
                          depth={3}
                          label={`#${s.order_index ?? "?"}  ${s.canonical_section_id || "?"}`}
                          value={
                            [
                              s.raw_title,
                              s.page_start != null && s.page_end != null
                                ? `pp. ${s.page_start}–${s.page_end}`
                                : "",
                            ]
                              .filter(Boolean)
                              .join("  ·  ") || ""
                          }
                          mono
                        />
                      ))}
                    </TreeRow>
                  );
                })}
            </TreeRow>
          </TreeRow>
        </div>
      </div>
    </div>
  );
}

/* ---------- tiny row primitives (server components via inline HTML) ---------- */

function Stat({
  label,
  value,
  valueText,
  sublabel,
}: {
  label: string;
  value?: number;
  valueText?: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="text-xl font-semibold mt-1">
        {valueText ?? (value != null ? value.toLocaleString() : "—")}
      </div>
      {sublabel ? (
        <div className="text-[10px] text-[var(--muted)] mt-1">{sublabel}</div>
      ) : null}
    </div>
  );
}

const GRID_COLS =
  "grid-cols-[minmax(240px,1.7fr)_110px_70px_minmax(170px,1.1fr)_minmax(180px,1.8fr)]";

function HeaderRow() {
  return (
    <div
      className={`grid ${GRID_COLS} items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/60 px-4 py-2 text-[11px] uppercase tracking-wide text-[var(--muted)]`}
    >
      <div>Item</div>
      <div>Type</div>
      <div className="text-right">Count</div>
      <div>Report coverage</div>
      <div>Detail</div>
    </div>
  );
}

function TreeRow({
  depth,
  name,
  type,
  typeTone = "muted",
  count,
  reportCoverage,
  detail,
  defaultOpen = false,
  children,
}: {
  depth: number;
  name: string;
  type: string;
  typeTone?: "accent" | "muted";
  count?: number;
  reportCoverage?: string;
  detail?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary
        className={`grid ${GRID_COLS} items-center gap-3 cursor-pointer list-none border-b border-[var(--border)]/60 px-4 py-2 hover:bg-[var(--background)]/50`}
        style={{ paddingLeft: 16 + depth * 18 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className="h-3 w-3 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-90"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M6 5l8 5-8 5V5z" />
          </svg>
          <span className="truncate text-sm font-medium">{name}</span>
        </div>
        <TypePill type={type} tone={typeTone} />
        <div className="text-right text-xs tabular-nums text-[var(--muted)]">
          {count != null ? count.toLocaleString() : ""}
        </div>
        <div className="truncate text-xs text-[var(--muted)]">{reportCoverage ?? ""}</div>
        <div className="truncate text-xs text-[var(--muted)]">{detail ?? ""}</div>
      </summary>
      <div>{children}</div>
    </details>
  );
}

function LeafRow({
  depth,
  label,
  value,
  mono = false,
}: {
  depth: number;
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div
      className={`grid ${GRID_COLS} items-start gap-3 border-b border-[var(--border)]/40 px-4 py-1.5 text-xs`}
      style={{ paddingLeft: 16 + depth * 18 + 18 }}
    >
      <div className={`min-w-0 ${mono ? "font-mono" : ""} text-[var(--foreground)]`}>
        {label}
      </div>
      <div className="text-[var(--muted)]">—</div>
      <div className="text-right text-[var(--muted)]">&nbsp;</div>
      <div className="text-[var(--muted)]">&nbsp;</div>
      <div className="text-[var(--muted)] whitespace-normal break-words">{value}</div>
    </div>
  );
}

function TypePill({ type, tone = "muted" }: { type: string; tone?: "accent" | "muted" }) {
  const color =
    tone === "accent"
      ? "text-[var(--accent)] border-[var(--accent)]/40 bg-[var(--accent)]/10"
      : "text-[var(--muted)] border-[var(--border)] bg-[var(--background)]";
  return (
    <span
      className={`inline-flex w-fit rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${color}`}
    >
      {type}
    </span>
  );
}
