import type { Metadata } from "next";
import { FaqPageContent } from "@/components/FaqPageContent";

export const metadata: Metadata = {
  title: "常见问题与工作流指南",
  description: "了解 AI Prospectus 工作流，以及从模型配置到 Word 导出的系统使用方法。",
};

export default function ZhFaqPage() {
  return <FaqPageContent locale="zh" />;
}
