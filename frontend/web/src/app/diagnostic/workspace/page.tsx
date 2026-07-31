import { DiagnosticWorkspacePageContent } from "@/components/DiagnosticWorkspacePageContent";

export const metadata = {
  title: "IPO Eligibility Workspace | AI Prospectus",
  description:
    "Upload issuer documents or enter structured fields, run multi-market listing eligibility diagnostics, and get readiness feedback with hard-gate scorecards.",
  alternates: {
    canonical: "/diagnostic/workspace",
    languages: {
      en: "/diagnostic/workspace",
      "zh-CN": "/zh/diagnostic/workspace",
    },
  },
};

export default function DiagnosticWorkspacePage() {
  return <DiagnosticWorkspacePageContent locale="en" />;
}
