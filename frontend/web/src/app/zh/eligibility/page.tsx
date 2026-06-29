import { EligibilityPageContent } from "@/components/EligibilityPageContent";

export const metadata = {
  title: "上市诊断 | AI Prospectus",
  description:
    "独立的公司上市条件诊断模块，用发行人输入和上市规则路径生成规则状态、缺口和审计轨迹。",
  alternates: {
    canonical: "/zh/eligibility",
    languages: {
      en: "/eligibility",
      "zh-CN": "/zh/eligibility",
    },
  },
};

export default function ChineseEligibilityPage() {
  return <EligibilityPageContent locale="zh" />;
}
