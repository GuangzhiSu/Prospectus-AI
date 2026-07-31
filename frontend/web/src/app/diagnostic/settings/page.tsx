import { SettingsPageContent } from "@/app/settings/page";

export const metadata = {
  title: "Eligibility Settings | AI Prospectus",
  description:
    "Inference backend settings for IPO eligibility — Local Qwen or cloud APIs, separate from prospectus drafting.",
};

export default function EligibilitySettingsPage() {
  return <SettingsPageContent locale="en" product="eligibility" />;
}
