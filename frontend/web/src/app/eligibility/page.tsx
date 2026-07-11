import { EligibilityPageContent } from "@/components/EligibilityPageContent";

export const metadata = {
  title: "Listing Eligibility Diagnostic | AI Prospectus",
  description:
    "Standalone listing eligibility diagnosis for issuer inputs, listing pathway rules, report statuses, and audit trails.",
  alternates: {
    canonical: "/eligibility",
    languages: {
      en: "/eligibility",
      "zh-CN": "/zh/eligibility",
    },
  },
};

export default function EligibilityPage() {
  return <EligibilityPageContent locale="en" />;
}
