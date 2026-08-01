import { redirect } from "next/navigation";

import { DeveloperToolsApp } from "@/components/DeveloperToolsApp";
import { hasDeveloperSession } from "@/lib/developer-auth";

export const metadata = {
  title: "Developer Tools",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DeveloperToolsPage() {
  if (!(await hasDeveloperSession())) redirect("/developer-tools/login");
  return <DeveloperToolsApp />;
}
