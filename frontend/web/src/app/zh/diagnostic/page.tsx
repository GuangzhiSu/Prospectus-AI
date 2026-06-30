import { EligibilityPageContent } from "@/components/EligibilityPageContent";

export const metadata = {
  title: "上市诊断 | AI Prospectus",
  description:
    "独立的 IPO 准备度诊断模块，用发行人输入和上市路径规则生成状态、缺口、需复核信号和审计轨迹。",
  alternates: {
    canonical: "/zh/diagnostic",
    languages: {
      en: "/diagnostic",
      "zh-CN": "/zh/diagnostic",
    },
  },
};

export default function ChineseDiagnosticPage() {
  return <EligibilityPageContent locale="zh" />;
}
