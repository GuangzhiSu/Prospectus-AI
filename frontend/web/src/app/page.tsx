import { OverviewPageContent } from "@/components/OverviewPageContent";

export const metadata = {
  title: "AI Prospectus | Private IPO AI workspace",
  description:
    "AI Prospectus connects IPO readiness diagnosis, evidence preparation, prospectus drafting, review notes, and Word export in a controlled private workspace.",
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      "zh-CN": "/zh",
    },
  },
};

export default function HomePage() {
  return <OverviewPageContent locale="en" />;
}
