import { EligibilityPageContent } from "@/components/EligibilityPageContent";

export const metadata = {
  title: "IPO Diagnostic | AI Prospectus",
  description:
    "Standalone IPO readiness diagnosis for issuer inputs, listing pathway rules, review-required signals, and audit trails.",
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
