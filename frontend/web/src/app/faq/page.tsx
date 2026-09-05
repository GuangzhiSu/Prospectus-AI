import type { Metadata } from "next";
import { FaqPageContent } from "@/components/FaqPageContent";

export const metadata: Metadata = {
  title: "FAQ & Workflow Guide",
  description: "Learn how the AI Prospectus workflow works and how to use the system from model setup to Word export.",
};

export default function FaqPage() {
  return <FaqPageContent />;
}
