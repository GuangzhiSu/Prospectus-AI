import { DiagnosticWorkspacePageContent } from "@/components/DiagnosticWorkspacePageContent";

export const metadata = {
  title: "IPO Diagnostic Workspace | AI Prospectus",
  description:
    "A dedicated IPO diagnostic workspace for CompanyProfile intake, deterministic threshold checks, soft-signal review queues, and gap-only report previews.",
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
