import { NextResponse } from "next/server";

import { DEVELOPER_COOKIE } from "@/lib/developer-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEVELOPER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
