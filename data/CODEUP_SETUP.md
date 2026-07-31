# Codeup Git LFS 数据发布（维护者）

大体积数据包（`.tar.zst`）放在 **独立的 Codeup 数据仓库**，通过 Git LFS 存储；主仓库只保留代码与 [`manifest.json`](manifest.json)。

## 前提

- [云效 Codeup](https://codeup.aliyun.com) 账号
- 本机已安装 **Git** 与 **Git LFS**（`git lfs install`）
- SSH 公钥或 HTTPS 个人访问令牌已配置到 Codeup

## 1. 创建仓库

在 Codeup 创建 **两个私有仓库**：

| 仓库 | 用途 |
|------|------|
| `prospectus-ui` | 应用代码、脚本、契约 JSON、`data/manifest.json` |
| `prospectus-ui-data` | 仅存放按 tag 分目录的 `.tar.zst` 包（启用 LFS） |

数据仓目录示例：

```text
prospectus-ui-data/
├── .gitattributes          # *.tar.zst → Git LFS
├── README.md
└── local-2026-05-21/
    ├── prospectus_corpus.tar.zst
    ├── prospectus_kg_output.tar.zst
    ├── kg_structure.tar.zst
    └── …
```

## 2. 初始化本地数据仓

```bash
export CODEUP_DATA_REPO_URL=git@codeup.aliyun.com:6a0f36b843d4694d6a535802/prospectus-ui-data.git
./scripts/codeup_data_repo.sh init "$CODEUP_DATA_REPO_URL"
```

默认克隆到 `~/.cache/prospectus-ui-data`（可用 `PROSPECTUS_DATA_REPO` 覆盖）。

## 3. 打包并推送到 Codeup

在 **主仓库根目录**：

```bash
# 仅打包 + 更新 manifest（不上传）
./scripts/publish_data_snapshot.sh --tag local-2026-05-21

# 打包并 push 到 Codeup LFS 数据仓
./scripts/publish_data_snapshot.sh --codeup-push --tag local-2026-05-21
```

然后提交 manifest 到主仓：

```bash
git add data/manifest.json
git commit -m "Publish data manifest local-2026-05-21"
git push
```

## 4. 协作者如何拉取

见 [`docs/COLLABORATOR_SETUP.zh-CN.md`](../docs/COLLABORATOR_SETUP.zh-CN.md) **方式 A-Codeup**。

简要步骤：

```bash
./scripts/codeup_data_repo.sh init git@codeup.aliyun.com:6a0f36b843d4694d6a535802/prospectus-ui-data.git
./scripts/codeup_data_repo.sh pull
eval "$(./scripts/codeup_data_repo.sh env)"
python scripts/sync_data.py fetch --profile dev-full
python scripts/sync_data.py verify --profile dev-full
```

## 5. 容量与维护

- Codeup 默认约 **5 GB LFS / 仓库**；当前 `dev-full` 压缩包合计约 **1 GB**。
- 每个 tag 会保留一份完整包；请在 Codeup 控制台定期清理旧 tag 目录，避免 LFS 配额耗尽。
- 若数据持续增长，可迁移到阿里云 OSS（见 [`REMOTE_SETUP.example.md`](REMOTE_SETUP.example.md) S3 段落）；manifest 结构不变。

## 相关脚本

| 脚本 | 作用 |
|------|------|
| [`scripts/codeup_data_repo.sh`](../scripts/codeup_data_repo.sh) | init / pull / push / env |
| [`scripts/publish_data_snapshot.sh`](../scripts/publish_data_snapshot.sh) | 打包 + `--codeup-push` |
| [`scripts/sync_data.py`](../scripts/sync_data.py) | fetch / verify（通过 `file://` 读取本地 LFS 文件） |
