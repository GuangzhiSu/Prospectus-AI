import { OverviewPageContent } from "@/components/OverviewPageContent";

export const metadata = {
  title: "AI Prospectus | 私有化 IPO AI 工作台",
  description:
    "AI Prospectus 将上市诊断、证据整理、招股书起草、复核提示和 Word 导出连接到一个受控的私有工作台。",
  alternates: {
    canonical: "/zh",
    languages: {
      en: "/",
      "zh-CN": "/zh",
    },
  },
};

export default function ChineseHomePage() {
  return <OverviewPageContent locale="zh" />;
}
