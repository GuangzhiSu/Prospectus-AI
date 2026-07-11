import { EligibilityPageContent } from "@/components/EligibilityPageContent";

export const metadata = {
  title: "上市诊断 | AI Prospectus",
  description:
    "上市诊断架构：AI 抽取、CompanyProfile 汇入、确定性硬规则比对、软信号复核和审计轨迹。",
  alternates: {
    canonical: "/zh/diagnostic",
    languages: {
      en: "/diagnostic",
      "zh-CN": "/zh/diagnostic",
    },
  },
};

export default function ChineseEligibilityPage() {
  return <EligibilityPageContent locale="zh" />;
}
