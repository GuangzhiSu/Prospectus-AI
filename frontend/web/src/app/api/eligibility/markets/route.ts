// GET /api/eligibility/markets — market → ruleset map for the UI
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MARKETS = [
  {
    key: "hkex_main_board",
    label: "Hong Kong — Main Board",
    labelZh: "香港 — 主板",
    rulesets: ["HKEX_Main_Board", "HKEX_Chapter_8A_WVR", "HKEX_Public_Float"],
  },
  {
    key: "hkex_gem",
    label: "Hong Kong — GEM",
    labelZh: "香港 — GEM",
    rulesets: ["HKEX_GEM", "HKEX_Public_Float"],
  },
  {
    key: "hkex_18c",
    label: "Hong Kong — Chapter 18C (Specialist Tech)",
    labelZh: "香港 — 第18C章（特专科技）",
    rulesets: ["HKEX_Chapter_18C_Specialist_Technology", "HKEX_Public_Float"],
  },
  {
    key: "hkex_18a",
    label: "Hong Kong — Chapter 18A (Biotech)",
    labelZh: "香港 — 第18A章（生物科技）",
    rulesets: ["HKEX_Chapter_18A_Biotech", "HKEX_Public_Float"],
  },
  {
    key: "cn_main_board",
    label: "PRC — SSE/SZSE Main Board",
    labelZh: "A股 — 沪深主板",
    rulesets: ["CN_Main_Board", "CN_CSRC_Preconditions"],
  },
  {
    key: "cn_star",
    label: "PRC — STAR Market",
    labelZh: "A股 — 科创板",
    rulesets: ["CN_STAR_Market", "CN_CSRC_Preconditions"],
  },
  {
    key: "cn_chinext",
    label: "PRC — ChiNext",
    labelZh: "A股 — 创业板",
    rulesets: ["CN_ChiNext", "CN_CSRC_Preconditions"],
  },
  {
    key: "cn_bse",
    label: "PRC — Beijing Stock Exchange",
    labelZh: "A股 — 北交所",
    rulesets: ["CN_BSE"],
  },
  {
    key: "sgx_mainboard",
    label: "Singapore — SGX Mainboard",
    labelZh: "新加坡 — SGX 主板",
    rulesets: ["SGX_Mainboard"],
  },
  {
    key: "sgx_catalist",
    label: "Singapore — Catalist",
    labelZh: "新加坡 — Catalist",
    rulesets: ["SGX_Catalist"],
  },
];

export async function GET() {
  return NextResponse.json({ markets: MARKETS });
}
