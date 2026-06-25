import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_API_PREFIXES = [
  "/api/agent1",
  "/api/agent2",
  "/api/chat",
  "/api/files",
  "/api/models",
  "/api/progress",
  "/api/reset",
  "/api/settings",
  "/api/system",
  "/api/updates",
];

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AI Prospectus Workspace"',
    },
  });
}

function credentialsAreValid(header: string | null) {
  const password = process.env.WORKSPACE_PASSWORD;
  if (!password) return true;
  if (!header?.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice("Basic ".length));
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    const user = decoded.slice(0, separator);
    const pass = decoded.slice(separator + 1);
    return user === (process.env.WORKSPACE_USER || "admin") && pass === password;
  } catch {
    return false;
  }
}

function isProtectedPath(pathname: string) {
  return (
    pathname === "/workspace" ||
    pathname.startsWith("/workspace/") ||
    pathname === "/zh/workspace" ||
    pathname.startsWith("/zh/workspace/") ||
    PROTECTED_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!credentialsAreValid(request.headers.get("authorization"))) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/workspace/:path*", "/zh/workspace/:path*", "/api/:path*"],
};
