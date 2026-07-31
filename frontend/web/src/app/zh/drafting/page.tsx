import { DraftingPageContent } from "@/components/DraftingPageContent";

export const metadata = {
  title: "招股书生成 | AI Prospectus",
  description:
    "受控的招股书生成工作台，覆盖证据准备、章节感知生成、复核提示和 Word 导出。",
  alternates: {
    canonical: "/zh/drafting",
    languages: {
      en: "/drafting",
      "zh-CN": "/zh/drafting",
    },
  },
};

export default function ChineseDraftingPage() {
  return <DraftingPageContent locale="zh" />;
}
