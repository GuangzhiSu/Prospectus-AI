import { DiagnosticWorkspacePageContent } from "@/components/DiagnosticWorkspacePageContent";

export const metadata = {
  title: "上市诊断工作台 | AI Prospectus",
  description:
    "上市诊断专用工作台：CompanyProfile 录入、确定性阈值检查、软信号复核队列和只标缺口的报告预览。",
  alternates: {
    canonical: "/zh/diagnostic/workspace",
    languages: {
      en: "/diagnostic/workspace",
      "zh-CN": "/zh/diagnostic/workspace",
    },
  },
};

export default function ChineseDiagnosticWorkspacePage() {
  return <DiagnosticWorkspacePageContent locale="zh" />;
}
