"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function DeveloperLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/developer-tools/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "登录失败。");
      router.replace("/developer-tools");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#738077]">
          Developer password
        </span>
        <input
          autoFocus
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 h-12 w-full border border-[#cad4cc] bg-white px-4 font-mono text-sm text-[#17201b] outline-none transition focus:border-[#267267] focus:ring-2 focus:ring-[#267267]/15"
          placeholder="请输入密码"
        />
      </label>
      {error ? (
        <p role="alert" className="border-l-2 border-[#bb5a43] bg-[#fff5f1] px-3 py-2 text-sm text-[#8d3d2c]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !password}
        className="flex h-12 w-full items-center justify-center bg-[#17201b] px-5 text-sm font-semibold text-white transition hover:bg-[#2c3d34] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "正在验证…" : "进入开发者工具"}
      </button>
      <p className="text-xs leading-5 text-[#738077]">
        这是独立的浏览器会话登录。关闭浏览器会话后，再次打开需重新输入密码。
      </p>
    </form>
  );
}
