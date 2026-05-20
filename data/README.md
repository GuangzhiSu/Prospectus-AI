# Data — issuer inputs and collaboration manifest

## Large files / team sync

Bulk issuer Excel and JSON are **not** in git. See **[`manifest.json`](manifest.json)** and:

- **[`docs/COLLABORATOR_SETUP.zh-CN.md`](../docs/COLLABORATOR_SETUP.zh-CN.md)** — 协作者完整搭建（中文）
- **[`docs/COLLABORATION.md`](../docs/COLLABORATION.md)** — English collaboration notes

```bash
python scripts/sync_data.py fetch --profile dev-full   # after PROSPECTUS_DATA_REMOTE is set
# or offline: scripts/ingest_data_bundle.sh /path/to/*.tar.zst
```

Maintainer packs and publishes snapshots: `./scripts/publish_data_snapshot.sh`

---

## Li Auto (2015.HK) financial documents (sample)

All files use English names for easier reference.

| Filename | Description |
|----------|-------------|
| `2015.HK-holdings-or-equity.xlsx` | Holdings or equity holdings |
| `2015.HK-business-data.xlsx` | Business data |
| `2015.HK-mainland-fund-holdings.xlsx` | Mainland public fund holdings |
| `2015.HK-share-capital-structure.xlsx` | Share capital structure |
| `2015.HK-company-introduction.xlsx` | Company introduction |
| `2015.HK-board-and-executives.xlsx` | Board and executives |
| `2015.HK-balance-sheet.xlsx` | Balance sheet (ARD) |
| `2015.HK-financial-ratios-comparison.xlsx` | Financial ratios comparison |
| `2015.HK-financial-data-comparison.xlsx` | Financial data comparison |
| `2015.HK-market-performance-comparison.xlsx` | Market performance comparison |
| `2015.HK-comprehensive-comparison.xlsx` | Comprehensive comparison |
| `2015.HK-growth-capability.xlsx` | Growth capability |
| `2015.HK-cash-flow.xlsx` | Cash flow |
| `2015.HK-profit-forecast-comparison.xlsx` | Profit forecast comparison |
| `2015.HK-operating-capability.xlsx` | Operating capability |
