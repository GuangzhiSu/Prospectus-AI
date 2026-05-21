# 协作者完整搭建指南

本文说明如何在本机获得与维护者一致的 **全部开发与运行内容**：源码、知识图谱（KG）、招股书 PDF 语料、示例输入数据，以及运行 Web / Agent 所需环境。

维护者会把大文件放在 Git 之外；请按下面步骤操作，不要指望 `git clone`  alone 就能得到一切。

---

## 一、先搞清楚：哪些在 Git 里，哪些不在

| 内容 | 是否在 GitHub | 你如何获取 |
|------|----------------|------------|
| 应用与流水线代码（`apps/`、`agent1.py`、`scripts/prospectus_kg/` 等） | 是 | `git clone` |
| KG 契约文件（`input_schema.json`、`input_schema_crosswalk.json` 等） | 是 | `git clone` |
| 数据清单 [`data/manifest.json`](../data/manifest.json)（含下载地址与校验和） | 是 | `git clone` |
| 招股书 PDF 语料 `prospectus_corpus/`（约 **750 MB** 压缩包） | **否** | 见下文「大文件」 |
| 完整 KG 产出 `prospectus_kg_output/`（约 **200 MB** 压缩包） | **否** | 见下文「大文件」 |
| 示例发行人 Excel/JSON `data/*.xlsx` 等 | **否** | 含在 `dev-full` 数据包 |
| Qwen 等 **模型权重** | **否** | 首次运行自动从 Hugging Face 下载 |
| 运行生成物 `agent1_output/`、`agent2_output/` | **否** | 本地跑流水线后生成 |

**「完整内容」= Git 仓库 + `dev-full` 数据包 + Python/Node 依赖 +（首次）模型下载。**

---

## 二、准备环境

### 磁盘与网络（建议）

- 空闲磁盘：**至少 15 GB**（数据包约 1 GB、解压后约 1.7 GB、`node_modules`、Python venv、Qwen 模型数 GB）
- 网络：能访问 GitHub；若用云存储拉数据，需维护者提供的 bucket 权限；模型需能访问 Hugging Face（或维护者提供离线模型路径）

### 软件

- **Git**
- **Python 3.10+**
- **Node.js 18+** 与 **npm**
- Linux / macOS / WSL 均可；Windows 见 [`docs/WINDOWS_INSTALL.md`](WINDOWS_INSTALL.md)

---

## 三、标准流程（推荐顺序）

### 步骤 1：克隆仓库并安装依赖

```bash
git clone <仓库地址>
cd prospectus-ui

python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cd apps/web
npm install
cd ../..
```

### 步骤 2：获取大文件（三选一）

任选 **一种** 方式即可凑齐 `dev-full` 所需的全部数据。维护者会告知你们团队用哪一种。

#### 方式 A — 从团队云存储拉取

维护者会告知具体用哪一种：**S3/OSS** 或 **Codeup Git LFS 数据仓**。

##### 方式 A1 — Codeup Git LFS（推荐：全部在阿里云 Codeup，无需 OSS）

维护者会提供：

- Codeup **数据仓** Git 地址（例如 `git@codeup.aliyun.com:<org>/prospectus-ui-data.git`）
- Codeup 仓库访问权限（SSH 或 HTTPS 令牌）
- 当前数据版本 tag（与 `data/manifest.json` 里 `published_tag` 一致）

需安装 [Git LFS](https://git-lfs.com)：`git lfs install`

在仓库根目录执行：

```bash
source .venv/bin/activate

./scripts/codeup_data_repo.sh init git@codeup.aliyun.com:<org>/prospectus-ui-data.git
./scripts/codeup_data_repo.sh pull
eval "$(./scripts/codeup_data_repo.sh env)"

python scripts/sync_data.py fetch --profile dev-full
python scripts/sync_data.py verify --profile dev-full
```

维护者详细说明见 [`data/CODEUP_SETUP.md`](../data/CODEUP_SETUP.md)。

##### 方式 A2 — S3 / 阿里云 OSS 等对象存储

维护者会提供：

- `PROSPECTUS_DATA_REMOTE`（例如 `s3://团队-bucket/prospectus-ai-data`）
- 若为 S3/OSS：`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`（或等价凭证）
- 当前数据版本 tag（与 `data/manifest.json` 里 `published_tag` 一致，例如 `local-2026-05-20` 或 `v1`）

在仓库根目录执行：

```bash
source .venv/bin/activate

export PROSPECTUS_DATA_REMOTE=s3://<维护者提供的 bucket 路径>
# 若用 S3/OSS，再 export AWS 相关变量

python scripts/sync_data.py fetch --profile dev-full
python scripts/sync_data.py verify --profile dev-full
```

或使用 Makefile：

```bash
make data-dev-full
```

`dev-full` 会自动下载并解压 **3 个包**：

| 包名 | 解压到 | 说明 |
|------|--------|------|
| `prospectus_corpus.tar.zst` | `prospectus_corpus/` | 交易所招股书 PDF |
| `prospectus_kg_output.tar.zst` | `prospectus_kg_output/` | 完整 KG（结构图、records、sections 等） |
| `data_samples.tar.zst` | `data/` | 示例发行人表格（在保留 `manifest.json` 的前提下合并） |

#### 方式 B — 离线压缩包（U 盘 / 网盘 / 维护者直发）

维护者会给你 **一个目录**，其中至少包含下列文件（名称需与下表一致）：

| 文件名 | 约大小 | 必需 |
|--------|--------|------|
| `prospectus_corpus.tar.zst` | ~750 MB | 是 |
| `prospectus_kg_output.tar.zst` | ~200 MB | 是 |
| `data_samples.tar.zst` | 很小 | 建议（示例 Excel） |

在仓库根目录逐个导入：

```bash
source .venv/bin/activate

./scripts/ingest_data_bundle.sh /路径/to/prospectus_corpus.tar.zst
./scripts/ingest_data_bundle.sh /路径/to/prospectus_kg_output.tar.zst
./scripts/ingest_data_bundle.sh /路径/to/data_samples.tar.zst

python scripts/sync_data.py verify --profile dev-full
```

若维护者给你的包是重新打的、与 `manifest.json` 中 sha256 不一致，可在确认来源可信后加 `--skip-sha`：

```bash
./scripts/ingest_data_bundle.sh /路径/to/xxx.tar.zst --skip-sha
```

#### 方式 C — 仅 PDF，本地重建 KG（最慢，不推荐作首选）

仅当你 **只有** `prospectus_corpus/` 且愿意长时间跑 GPU/CPU 流水线时使用：

```bash
source .venv/bin/activate
python -m scripts.build_prospectus_kg --stages all --resume
```

耗时长，且需本机 Qwen 与足够算力；优先用方式 A 或 B。

---

### 步骤 3：配置 Web 应用

将路径改成你本机 **绝对路径**：

```bash
cat > apps/web/.env.local << 'EOF'
PROSPECTUS_ROOT=/你的绝对路径/prospectus-ui
AGENT1_PYTHON=/你的绝对路径/prospectus-ui/.venv/bin/python
AGENT1_MODEL=Qwen/Qwen2.5-3B-Instruct
AGENT1_USE_CPU=1
EOF
```

无 NVIDIA GPU 时建议 `AGENT1_USE_CPU=1`；有 GPU 可去掉该行并按 [`README.md`](../README.md) 配置。

### 步骤 4：启动并确认

```bash
# 仓库根目录
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

可选检查：

- 主流程：上传 `data/` 下示例 `.xlsx` → Run Agent1 → Agent2（**首次会下载 Qwen 模型**，需等待）
- KG 探索页：`/kg-view` — 需存在 `prospectus_kg_output/structure/docgraph.json`（`dev-full` 或 `kg-dev` 包解压后应有）

---

## 四、装完后的目录自检

在仓库根目录执行：

```bash
python scripts/sync_data.py verify --profile dev-full
```

并人工确认下列路径 **存在且非空**：

```text
prospectus-ui/
├── prospectus_corpus/              # 多个 .pdf
├── prospectus_kg_output/
│   ├── structure/docgraph.json     # KG 探索页需要
│   ├── inputs/
│   │   ├── input_schema.json       # git 也有，解压包会覆盖/对齐
│   │   ├── input_schema_crosswalk.json
│   │   └── records/                # 大量 .json
│   ├── writing/                    # section cards
│   └── …
├── data/                           # 示例 .xlsx（可有 README.md、manifest.json）
├── agent1.py
├── apps/web/node_modules/
└── .venv/
```

**不需要**、也不应提交到 Git 的目录（本地运行后才会有）：

- `agent1_output/`、`agent2_output/`
- `apps/web/.next/`

---

## 五、只要部分能力时（可选）

若你 **不** 做 KG 流水线，只做 Agent1→Agent2 起草：

- Git 克隆 + 契约 JSON 即可（profile **`minimal`**）
- 仍需 `data/` 里发行人 Excel（可只要 `data_samples` 包或自己准备）

若你做 KG 开发 / `kg-view`，但不需要 PDF 语料：

```bash
python scripts/sync_data.py fetch --profile kg-dev
# 或 ingest：kg_structure、kg_writing、kg_inputs_bulk 三个包
```

| Profile | 包含内容 |
|---------|----------|
| `minimal` | 仅 Git 内契约文件 |
| `kg-dev` | 结构 KG + writing cards + records 等（无 PDF 语料） |
| `dev-full` | **全部**（语料 + 完整 `prospectus_kg_output` + 示例 data） |

---

## 六、模型权重（与数据包分开）

数据包 **不包含** Qwen 权重。首次跑 Agent1/Agent2 时，`llm_qwen.py` 会从 Hugging Face 拉取 `AGENT1_MODEL`（默认 `Qwen/Qwen2.5-3B-Instruct`）。

可预先下载（可选）：

```bash
python scripts/download_qwen_model.py \
  --repo-id Qwen/Qwen2.5-3B-Instruct \
  --out-dir ~/.cache/huggingface/hub
```

内网无法访问 Hugging Face 时，请向维护者索取模型目录或镜像说明。

---

## 七、常见问题

**Q：`git clone` 后 `prospectus_kg_output` 几乎为空？**  
正常。必须完成步骤 2（A 或 B），或本地跑 `build_prospectus_kg`。

**Q：`fetch` 报错 URL not resolved？**  
未设置 `PROSPECTUS_DATA_REMOTE`，或维护者尚未上传；改用方式 B 离线包。

**Q：`verify` 报 SHA256 mismatch？**  
包与当前 `data/manifest.json` 不一致。用维护者提供的对应版本 manifest，或 `ingest` 时加 `--skip-sha`（仅在你信任来源时）。

**Q：`/kg-view` 提示缺少 docgraph？**  
未解压 `prospectus_kg_output` 全量包，或未拉取 `kg-dev`/`dev-full`。

**Q：磁盘不够？**  
`dev-full` 解压后约 1.7 GB；可只拉 `kg-dev` + 单独拷 corpus，或向维护者要分卷包。

---

## 八、修改后如何交回维护者

- **代码、prompt、契约 JSON**：Git 分支 → Pull Request  
- **大批量 KG / records / 语料**：打包回传，见英文流程 [`COLLABORATION.md`](COLLABORATION.md) 中 “Returning bulk KG work”

```bash
./scripts/pack_data_bundle.sh kg-dev
# 将 dist/data-bundles/*.tar.zst 发给维护者，或在你有权限时：
# python scripts/sync_data.py push --profile kg-dev --tag <你的名字-日期> --update-manifest
```

---

## 九、向维护者索取的清单

开始搭建前，可向仓库维护者确认：

1. Git 仓库地址与分支（通常 `main` / `develop`）  
2. 数据获取方式：**Codeup LFS 数据仓**（见 [`data/CODEUP_SETUP.md`](../data/CODEUP_SETUP.md)）、**S3/OSS 凭证 + `PROSPECTUS_DATA_REMOTE`**，或 **离线 tar.zst 下载链接/拷贝**  
3. 当前数据版本 tag（与 `data/manifest.json` 中 `published_tag` 一致）  
4. 是否需 Hugging Face token、VPN 或内网模型镜像  
5. Windows 用户是否使用 [`WINDOWS_INSTALL.md`](WINDOWS_INSTALL.md) 安装包流程  

---

## 相关文档

- 英文协作说明（含回传流程）：[`COLLABORATION.md`](COLLABORATION.md)  
- 维护者发布数据：[`data/REMOTE_SETUP.example.md`](../data/REMOTE_SETUP.example.md)  
- 主 README：[`README.md`](../README.md)
