import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DeveloperLoginForm } from "@/components/DeveloperLoginForm";
import { hasDeveloperSession } from "@/lib/developer-auth";

export const metadata = {
  title: "Developer Tools Login",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DeveloperToolsLoginPage() {
  if (await hasDeveloperSession()) redirect("/developer-tools");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101a16] px-5 py-12 text-[#17201b]">
      <div className="absolute inset-0 opacity-[0.08]">
        <Image src="/app-icon-512.png" alt="" fill sizes="100vw" className="object-cover" />
      </div>
      <div className="relative w-full max-w-md border border-white/15 bg-[#f7faf6] p-7 shadow-2xl sm:p-9">
        <div className="flex items-center gap-3 border-b border-[#d7dfd7] pb-5">
          <Image src="/app-icon.png" alt="AI Prospectus" width={42} height={42} />
          <div>
            <p className="text-sm font-semibold">AI Prospectus</p>
            <p className="text-xs text-[#738077]">Internal evaluation workspace</p>
          </div>
        </div>
        <div className="pt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#267267]">Restricted</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">开发者工具</h1>
          <p className="mt-3 text-sm leading-6 text-[#5f6d64]">
            登录后可查看章节 Prompt、公司数据集、真实招股书 section，并运行批量 RCA 实验。
          </p>
        </div>
        <DeveloperLoginForm />
        <Link href="/" className="mt-6 inline-block text-xs font-semibold text-[#5f6d64] hover:text-[#17201b]">
          ← 返回网站
        </Link>
      </div>
    </main>
  );
}
