import { SettingsPageContent } from "@/app/settings/page";

export const metadata = {
  title: "上市资格设置 | AI Prospectus",
  description: "上市资格诊断专用推理后端设置（与招股书起草分开）。",
};

export default function ChineseEligibilitySettingsPage() {
  return <SettingsPageContent locale="zh" product="eligibility" />;
}
