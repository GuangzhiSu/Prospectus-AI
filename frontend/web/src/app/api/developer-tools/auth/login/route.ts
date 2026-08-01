import { NextResponse } from "next/server";

import {
  DEVELOPER_COOKIE,
  developerSessionToken,
  passwordIsValid,
} from "@/lib/developer-auth";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  return current.count >= 8;
}

export async function POST(request: Request) {
  const key = clientKey(request);
  if (isRateLimited(key)) {
    return NextResponse.json({ error: "尝试次数过多，请十分钟后重试。" }, { status: 429 });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }

  if (!passwordIsValid(password)) {
    const current = attempts.get(key)!;
    current.count += 1;
    attempts.set(key, current);
    return NextResponse.json({ error: "密码错误。" }, { status: 401 });
  }

  attempts.delete(key);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEVELOPER_COOKIE, developerSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    // Deliberately no maxAge/expires: login ends with the browser session.
  });
  return response;
}
