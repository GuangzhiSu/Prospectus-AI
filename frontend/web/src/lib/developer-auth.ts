import crypto from "node:crypto";
import { cookies } from "next/headers";

export const DEVELOPER_COOKIE = "prospectus_developer_session";

function configuredPassword(): string {
  return process.env.DEVTOOLS_PASSWORD || "test001";
}
function signingSecret(): string {
  return process.env.DEVTOOLS_AUTH_SECRET || `prospectus-devtools:${configuredPassword()}`;
}

function expectedToken(): string {
  return crypto
    .createHmac("sha256", signingSecret())
    .update("developer-tools-session-v1")
    .digest("base64url");
}

export function passwordIsValid(candidate: string): boolean {
  const actual = Buffer.from(configuredPassword(), "utf8");
  const supplied = Buffer.from(candidate, "utf8");
  if (actual.length !== supplied.length) return false;
  return crypto.timingSafeEqual(actual, supplied);
}

export function developerSessionToken(): string {
  return expectedToken();
}

export async function hasDeveloperSession(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(DEVELOPER_COOKIE)?.value || "";
  const expected = Buffer.from(expectedToken(), "utf8");
  const supplied = Buffer.from(value, "utf8");
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}
