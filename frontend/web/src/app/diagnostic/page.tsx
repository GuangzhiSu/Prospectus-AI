import { EligibilityPageContent } from "@/components/EligibilityPageContent";

export const metadata = {
  title: "IPO Diagnostic | AI Prospectus",
  description:
    "IPO diagnostic architecture showing AI extraction, CompanyProfile handoff, deterministic hard-rule comparison, soft-signal review, and audit trails.",
  alternates: {
    canonical: "/diagnostic",
    languages: {
      en: "/diagnostic",
      "zh-CN": "/zh/diagnostic",
    },
  },
};

export default function DiagnosticPage() {
  return <EligibilityPageContent locale="en" />;
}
