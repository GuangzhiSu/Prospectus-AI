import { DraftingPageContent } from "@/components/DraftingPageContent";

export const metadata = {
  title: "Prospectus Drafting | AI Prospectus",
  description:
    "A controlled prospectus drafting workspace for evidence preparation, section-aware generation, review notes, and Word export.",
  alternates: {
    canonical: "/drafting",
    languages: {
      en: "/drafting",
      "zh-CN": "/zh/drafting",
    },
  },
};

export default function DraftingPage() {
  return <DraftingPageContent locale="en" />;
}
