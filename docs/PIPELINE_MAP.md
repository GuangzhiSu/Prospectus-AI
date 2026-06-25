# PIPELINE_MAP — Prospectus-AI 流水线梳理

> 只读梳理，未改动仓库任何代码或数据。所有路径相对 `Prospectus-AI-main/`，除非另注。
> 当前实验对象：商汤（SenseTime, 0020.HK）招股书；当前仓库内可跑的真实输入样本是优必选（UBTECH, 9880）的 `data.json`。

---

## 1. Agent 流水线架构（几个 agent，各吃什么、吐什么）

主工作流是 **两阶段** + 一层离线的知识图谱（KG）准备层。

```
              ┌─────────────────────── 离线 KG / native-doc 准备层（scripts/prospectus_kg/）──────────────────────┐
              │  IPO Input Report PDF ──build_input_schema_en.py──▶ input_schema*.json（Schema A 字段契约）        │
              │  原始招股书 PDF ──reverse_engineer_*.py / stage3_extract_v2.py──▶ records/（按字段抽取的真值）       │
              └──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                  │（schema + 门控映射喂给 Agent2 的 writer prompt）
                                                  ▼
  data/ 里的 .xlsx/.json/.docx/.pdf ──▶ [Agent1] ──▶ agent1_output/ ──▶ [Agent2 = LangGraph] ──▶ agent2_output/*.md ──▶ 导出 .docx
       （发行人原始材料）                  抽取/分块/                text_chunks +              逐节起草                section_*.md /
                                          分桶 A–H                 fact_store +                                      all_sections.md
                                                                   rag_chunks
```

### 1.1 Agent1 —— 抽取与分桶（`agent1.py`）
- **吃**：`data/`（或 `--data-dir`）下的 `.xlsx / .json / .docx / .pdf`。可选 `data/manifest.json`（来自 native-doc 逆向，提供 per-file 的 `section_hint` 和 Schema A `field_id`）。
- **做**：
  - Excel → 每个 sheet 用 Qwen 生成 2–4 句摘要 + 按 600 字/100 重叠分块（`agent1.py:289`, `:434`, `:496`）。
  - JSON → 递归拍平成结构化 facts（`_extract_facts`, `agent1.py:113`）+ 把长文本/字符串数组抽成叙述 chunk（`extract_text_from_json`, `agent1.py:240`）。
  - DOCX/PDF → 逐段/逐页抽文本再分块（`agent1.py:388`, `:411`）。
  - 把每条内容分到 **A–H 八个证据桶**（`SECTIONS`, `agent1.py:30`），通过文件名/JSON 类别启发式（`FILE_TO_SECTION`, `JSON_CATEGORY_TO_SECTION`, `agent1.py:41`, `:93`）。
- **吐**：`agent1_output/`
  - `text_chunks.jsonl` —— 叙述块（RAG 用）
  - `fact_store.jsonl` —— 结构化事实（metric/period/value/unit）
  - `rag_chunks.jsonl` —— 合并视图（向后兼容旧检索器）
  - `by_section/section_*.jsonl` —— 分桶预览
  - `manifest.json` —— 计数与 sheet 摘要
  - 各记录字段见 §2.3。

### 1.2 Agent2 —— 逐节起草（`agent2.py` + `prospectus_graph/`）
一个用 **LangGraph** 编排的小型多 agent 状态机。图的拓扑（`prospectus_graph/graph.py:12`）：

```
START → retriever → [planner] → section_writer → verifier ──┬── should_revise? ──▶ revision ──▶（回到 verifier）
                                                            └── 否 ──▶ assembler → END
```

| 节点 | 吃 | 吐 | 代码 |
|------|----|----|------|
| **retriever** | `agent1_output/` 的 `text_chunks`+`fact_store`（Hybrid）或 `rag_chunks`（Legacy） | `retrieval_context`, `text_evidence`, `retrieved_facts` | `agent2.py:553`(`_hybrid_supported`), `:559`(选检索器), `:567`(节点) |
| **planner**（仅 Hybrid） | 检索证据 + KG 结构骨架 | `planner_outline`, `planner_fact_mapping` | 在 retriever 与 writer 之间 |
| **section_writer** | 证据 + `agent2_section_requirements.json` 的本节要求 + crosswalk 门控文档块 | `draft_text` | `agent2.py:162`(门控注入), `:230`(结构注入) |
| **verifier** | `draft_text` | `verification_issues`, `should_revise`, `verifier_summary` | `prospectus_graph/verifier.py` |
| **revision** | 草稿 + verifier 问题 | 修订后的 `draft_text`（回 verifier，受 `max_revision_loops` 限制） | — |
| **assembler** | 通过校验的文本 | `section_*.md` / `all_sections.md` | `prospectus_graph/output_bundle.py` |

- **检索两种模式**：存在 `text_chunks.jsonl`/`fact_store.jsonl` → **Hybrid**（语义+事实过滤，带 planner）；只有 `rag_chunks.jsonl` → **Legacy**（无 planner）。判定在 `agent2.py:553`。
- **每节由 `agent2_section_requirements.json` 驱动**：共 **31 个 section**（key 见 §2.4），每节含 `name / requirements（起草指令）/ kg_section_id / kg_function / kg_typical_structure`。
- **门控与 DD 证据**：`input_schema_crosswalk.json` 给每个 section 列出必须就位的 Schema A 门控文档；缺失则 writer 插 `[[AI: DD evidence needed — <field_id>]]`（见 `_coverage_vs_report.md` 第 268 行起）。
- 状态对象全字段见 `prospectus_graph/state.py:35`（`SectionDraftState`）。
- 输出是 **sponsor-counsel 工作稿**，不是终版；会留 `[Information not provided in the documents]` 和 `[[AI:VERIFY|…]] / [[AI:CITE|…]] / [[AI:XREF|…]] / [[AI:LPD|…]]` 标记。

### 1.3 旁路 / 遗留
- **Legacy RAG 路由**：`frontend/web` 的 `/api/chat` → `lib/rag.ts` + `platform/services/local-llm/`（实验用，非主页流程）。
- **DocGraph**：`knowledge-module/prospectus_docgraph/`（解析/挖掘/导出招股书文档图，KG 构建侧）。
- 命令行一键跑：`run_full_pipeline.sh`（先 `agent1.py` 再 `agent2.py --section …`）。

---

## 2. Agent1 的确切输入 schema / 格式

### 2.1 入口与文件发现
`run_agent1()`（`agent1.py:449`）从 `data_dir`（默认 `data/`）递归收集 `*.xlsx / *.docx / *.pdf` 和顶层 `*.json`（排除 `manifest.json`）。给 `--project-id` 时读 `data/<id>/`、写 `agent1_output/<id>/`。

### 2.2 JSON 输入契约（当前主用格式）
顶层是一个对象，**键是「类别」，值是该类别下的字段对象**。Agent1 通过 `JSON_CATEGORY_TO_SECTION`（`agent1.py:93`）把类别映射到 A–H 桶：

| JSON 顶层类别 | → 桶 | | JSON 顶层类别 | → 桶 |
|---|---|---|---|---|
| `company_profile` | A | | `financials` | D |
| `corporate_structure` | A | | `operating_metrics` | D |
| `business` | A | | `risk_related_data` | C |
| `products_and_technology` | A | | `management` | F |
| `customers` | A | | `shareholders` | E |
| `market` | B | | `ipo_offering` | H |
| `competition` | B | | （未知类别默认） | A |

抽取规则（`agent1.py:113`–`265`）：
- **标量**（str/int/float/bool）→ 一条 fact，`metric = 末级键名`，`unit` 由键名推断（`_rmb→RMB`、`_pct/_ratio→%` 等，`_infer_unit`, `agent1.py:103`）。
- **对象数组**（如 `income_statement: [{period, revenue_rmb, …}]`）→ 每个数组元素里，`period`/`date` 作周期，其余键各成一条 fact。
- **`{low, high, currency}`** → 识别为 `price_range`（如 `offering_price_range_hkd`）。
- **长字符串（>200 字）或字符串数组**（如 `industry_trends`、`competitive_advantages`）→ 进 `text_chunks`（叙述），其余进 `fact_store`。
- `null` 值跳过（如 `use_of_proceeds: null` 不产生 fact）。

> 也支持 Excel/DOCX/PDF 输入：Excel 按 sheet 摘要+分块进 text_chunks；这些没有 JSON 那样的字段级 fact 拍平。

### 2.3 Agent1 输出记录 schema
- **`text_chunks.jsonl`**（`agent1.py:511`/`:545`）：
  `{text, source_file, section_hint(A–H), schema_field_hint, prospectus_section_hint, topic, importance, chunk_id, source_type(excel_sheet|json_narrative|docx_*|pdf_page), [sheet_name|page]}`
- **`fact_store.jsonl`**（`agent1.py:124`，+`fact_id` 于 `:532`）：
  `{field, period, metric, value, unit, metadata:{source_file, section_hint, …}, fact_id}`
- **`rag_chunks.jsonl`**（`agent1.py:656`）：
  `{chunk_id, section_id, section, source_file, sheet_name, chunk_index, text, sheet_summary, source_type}`

### 2.4 Agent2 的 31 个 section key（`agent2_section_requirements.json`）
`ExpectedTimetable, Contents, Summary, Definitions, Glossary, ForwardLooking, RiskFactors, Waivers, InfoProspectus, DirectorsParties, CorporateInfo, Regulation, IndustryOverview, HistoryReorg, Business, ContractualArrangements, ControllingShareholders, ConnectedTransactions, DirectorsSeniorMgmt, SubstantialShareholders, ShareCapital, FinancialInfo, UseOfProceeds, Underwriting, GlobalOfferingStructure, Appendices, BackCover, CornerstoneInvestors, Cover, HowToApply`

---

## 3. 当前输入数据存在哪、什么格式

| 物件 | 位置 | 格式 / 说明 |
|------|------|------|
| **当前真实输入样本** | `Prospectus-AI-main/data.json`（= research 根目录 `data.json`，**md5 完全相同** `4da5f219…`） | 优必选 UBTECH(9880) 的结构化 JSON，13 个顶层类别，即 §2.2 契约。**这是目前唯一现成、agent1 直接能吃的输入记录。** |
| `data/` 目录 | `Prospectus-AI-main/data/` | **只有文档**：`README.md`、`manifest.json`、`CODEUP_SETUP.md`、`REMOTE_SETUP.example.md`。真正的发行人 `.xlsx/.json`（README 提到的李想 2015.HK 样本等）**不在 git 里**，需从 Codeup LFS 拉取或离线包导入。 |
| **大数据包（未解压）** | `research/原文件/`（5 个哈希命名文件） | 实为 Codeup LFS 的 `.tar.zst` 包，哈希=`manifest.json` 里的 sha256：见下表。 |
| 已解压的 KG 输入 | `prospectus_kg_output/inputs/` | 只有 schema 契约文件：`input_schema.json`(2.0)、`input_schema_sections.json`、`input_schema_crosswalk.json`、`_coverage_vs_report.md`。records/structure/writing **未解压**（在包里）。 |
| 招股书 PDF 库 | `research/PROSPECTUSES/` | 12 份港交所 PDF，按「申报编号_语言」命名（如 `2021080300011-E.pdf`、`2025040700010_c.pdf`）。 |
| 参考 PDF | `research/tech,ai/`、`research/*.pdf` | 论文与提案。 |
| 港交所爬虫 | `research/港交所招股书爬虫.ipynb` | 抓取招股书的 notebook。 |

**`原文件/` 哈希 ↔ 数据包对照**（来自 `data/manifest.json`，`published_tag = local-2026-05-20`）：

| 哈希文件名（前 8 位） | 数据包 | 大小 | 内容 |
|---|---|---|---|
| `0430befe…` | `prospectus_corpus.tar.zst` | 781 MB | **招股书 PDF 语料库**（含商汤等原始 PDF，团队内部） |
| `e2d88662…` | `prospectus_kg_output.tar.zst` | 208 MB | 完整 KG 输出树 |
| `4be0e118…` | `kg_inputs_bulk.tar.zst` | 143 MB | 逆向 records / 原始抽取（含按发行人的 KG 真值记录） |
| `63af85cf…` | `kg_structure.tar.zst` | 604 KB | 结构 KG（docgraph.json 等） |
| `5a839591…` | `data_samples.tar.zst` | 16 KB | Agent1 样本 Excel/JSON |

> 解压走 `scripts/sync_data.py` / `scripts/ingest_data_bundle.sh`（见 README「Fetch large files」）。**本次只读，未解压。**

---

## 4. 标定用的商汤招股书在哪

**结论：商汤（SenseTime, 0020.HK）是构建输入 schema 的「标定/参照发行人」**——不是一份单独躺在某处的文件，而是贯穿在 schema 与抽取样例里的基准案例：

1. **Schema 字段示例**（最直接的标定痕迹）：`input_schema*.json` 与 `agent2_section_requirements.json` 里大量字段的 `"example"` 直接取自商汤：
   - `prospectus_kg_output/inputs/input_schema_sections.json:246` → `"Shanghai SenseTime Technology Development Co., Ltd."`
   - 同文件 `:359` `https://www.sensetime.com`；`:439` 股票代码 `"0020"`；`:446`/`:1028` `"SenseTime Group Inc."`
   - `agent2_section_requirements.json:1044/1524/2576/2720` 同类示例。
2. **抽取 few-shot 标定**：`scripts/prospectus_kg/stage3_extract_v2.py:118` 起的 `_FEWSHOT_EXAMPLES`，用商汤封面页文本作为字段抽取（Issuer Name / Corporate Structure / Joint Sponsors）的金标准样例。
3. **schema 的源文档**：`input_schema.json:3` `source_document = "docs/IPO_Input_Report_EN.docx (1).pdf"`（注意：schema 本身来自这份《IPO 输入报告》，商汤是其中的范例发行人）。该源 PDF **当前不在仓库**（`docs/` 里没有）。
4. **商汤招股书 PDF 原件**：应在未解压的 `prospectus_corpus.tar.zst`（`原文件/0430befe…`，781 MB）内；按字段抽取的商汤 KG 真值记录应在 `kg_inputs_bulk.tar.zst`（`原文件/4be0e118…`，143 MB）的 `records/` 下。**两者目前都未解压。**
5. `research/PROSPECTUSES/` 的 12 份 PDF 按港交所申报编号命名，文件名中**未见明显的商汤(0020)条目**；商汤原件更可能在上面的 corpus 包里。

> 若要把商汤设为正式实验对象，下一步通常是：解压 corpus/inputs 包定位商汤 PDF 与已抽取 records → 或按 §2.2 契约新建一份 `sensetime.json`（仿 `data.json`）→ 投给 Agent1。（本次未执行任何改动。）

---

## 附录：一条完整的「现有输入记录」示例（取自 `data.json`，优必选）

下面是 `data.json` 中 **`company_profile` 类别的完整记录**（agent1 会把它整体当作 §2.2 契约的一条输入，归入 A 桶）：

```json
"company_profile": {
  "company_name": "UBTECH ROBOTICS CORP LTD",
  "company_chinese_name": "深圳市優必選科技股份有限公司",
  "stock_code": "9880",
  "legal_structure": "joint stock company incorporated in the PRC with limited liability",
  "incorporation_jurisdiction": "PRC",
  "headquarters_location": "Shenzhen, PRC",
  "strategic_positioning": "smart service robotic products and services provider",
  "branch_offices_count": 2,
  "branch_offices": ["Beijing branch", "Baoan branch"],
  "company_history_milestones": [
    {"year": 2016, "event": "launched consumer-level robots and other hardware devices"},
    {"year": 2017, "event": "launched education smart robotic and general service smart robotic products and services"},
    {"year": 2020, "event": "launched logistics smart robotic products and services"},
    {"year": 2022, "event": "launched wellness and elderly care smart robotic products and services"}
  ]
}
```

**Agent1 处理后，这条记录会拍平成 `fact_store.jsonl` 里的多条 fact**，例如：

```json
{"field": "company_profile.company_name", "period": null, "metric": "company_name", "value": "UBTECH ROBOTICS CORP LTD", "unit": null, "metadata": {"source_file": "data.json", "section_hint": "A"}, "fact_id": "…"}
{"field": "company_profile.stock_code", "period": null, "metric": "stock_code", "value": "9880", "unit": null, "metadata": {"source_file": "data.json", "section_hint": "A"}, "fact_id": "…"}
{"field": "company_profile.branch_offices_count", "period": null, "metric": "branch_offices_count", "value": 2, "unit": null, "metadata": {"source_file": "data.json", "section_hint": "A"}, "fact_id": "…"}
{"field": "company_profile.company_history_milestones", "period": null, "metric": "year", "value": 2016, "unit": null, "metadata": {"source_file": "data.json", "section_hint": "A"}, "fact_id": "…"}
{"field": "company_profile.company_history_milestones", "period": null, "metric": "event", "value": "launched consumer-level robots and other hardware devices", "unit": null, "metadata": {"source_file": "data.json", "section_hint": "A"}, "fact_id": "…"}
```

> 注：`branch_offices`（字符串数组、元素短）按 `_extract_facts` 的 list 分支逐项进 fact（`metric:"item"`），但因元素 ≤200 字不算叙述，不进 text_chunks；而像 `business.competitive_advantages` 这类长字符串数组会进 `text_chunks.jsonl`。带周期的记录示例（来自 `financials.income_statement`）：

```json
{"field": "financials.income_statement", "period": "FY2022", "metric": "revenue_rmb", "value": 1008272000, "unit": "RMB", "metadata": {"source_file": "data.json", "section_hint": "D"}, "fact_id": "…"}
{"field": "financials.income_statement", "period": "FY2022", "metric": "gross_margin", "value": 0.292, "unit": "%", "metadata": {"source_file": "data.json", "section_hint": "D"}, "fact_id": "…"}
```

价格区间记录（`ipo_offering.offering_price_range_hkd = {low:86, high:116}`）会被识别为 `price_range` / `price_range_high` 两条 fact（`agent1.py:163`）。
