import type { Metadata } from "next";
import { WorkspacePageContent } from "@/components/WorkspacePageContent";

export const metadata: Metadata = {
  title: { absolute: "Prospectus AI" },
};

export default function WorkspacePage() {
  return <WorkspacePageContent />;
}
