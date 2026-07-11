import { DownloadPageContent } from "@/components/DownloadPageContent";

export const metadata = {
  title: "下载 Prospectus AI",
  description: "下载 Prospectus AI 的 Windows、macOS 和 Linux 发布版本。",
};

export default function ChineseDownloadPage() {
  return <DownloadPageContent locale="zh" />;
}
