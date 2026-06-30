import { DownloadPageContent } from "@/components/DownloadPageContent";

export const metadata = {
  title: "下载 AI Prospectus",
  description:
    "下载私有化 AI Prospectus 工作台，用于受控上市诊断、证据整理、招股书起草、复核和导出流程。",
};

export default function ChineseDownloadPage() {
  return <DownloadPageContent locale="zh" />;
}
