import { DiagnosticWorkspacePageContent } from "@/components/DiagnosticWorkspacePageContent";

export const metadata = {
  title: "上市资格诊断工作区 | AI Prospectus",
  description:
    "上传发行人文件或填写结构化字段，运行多市场上市资格诊断，并获取准备度反馈与硬性门槛记分卡。",
  alternates: {
    canonical: "/zh/diagnostic/workspace",
    languages: {
      en: "/diagnostic/workspace",
      "zh-CN": "/zh/diagnostic/workspace",
    },
  },
};

export default function ChineseDiagnosticWorkspacePage() {
  return <DiagnosticWorkspacePageContent locale="zh" />;
}
