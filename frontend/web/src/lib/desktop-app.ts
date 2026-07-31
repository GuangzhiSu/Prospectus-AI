export const WORKSPACE_PATH = "/workspace";
export const ZH_WORKSPACE_PATH = "/zh/workspace";

/** Public marketing routes redirected to the drafting workspace inside Electron. */
export const DESKTOP_MARKETING_REDIRECTS: Record<string, string> = {
  "/": WORKSPACE_PATH,
  "/zh": ZH_WORKSPACE_PATH,
  "/download": WORKSPACE_PATH,
  "/zh/download": ZH_WORKSPACE_PATH,
  "/eligibility": WORKSPACE_PATH,
  "/zh/eligibility": ZH_WORKSPACE_PATH,
};

export function isElectronUserAgent(userAgent: string): boolean {
  return userAgent.includes("Electron");
}

export function isDesktopShell(): boolean {
  if (typeof navigator === "undefined") return false;
  return isElectronUserAgent(navigator.userAgent);
}
