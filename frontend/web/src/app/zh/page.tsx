import { OverviewPageContent } from "@/components/OverviewPageContent";

export const metadata = {
  title: "AI Prospectus | 私有化 AI 文档生成",
  description: "面向法律、投行与合规团队的私有化上市诊断与招股书起草工作台。",
  alternates: { canonical: "/zh", languages: { en: "/", "zh-CN": "/zh" } },
};

export default function ChineseHome() {
  return <OverviewPageContent locale="zh" />;
}
