export type DownloadAsset = {
  id: string;
  title: string;
  platform: string;
  description: string;
  href: string;
  fallbackHref?: string;
  recommended?: boolean;
};

const RELEASE_BASE_URL =
  "https://github.com/GuangzhiSu/Prospectus-AI/releases/download/0.1.0";

export const DOWNLOAD_ASSETS: DownloadAsset[] = [
  {
    id: "windows",
    title: "Windows Installer",
    platform: "Windows",
    description: "Standard installer that creates Start Menu and optional desktop shortcuts.",
    href: `${RELEASE_BASE_URL}/ProspectusAI-Setup-0.1.0.exe`,
    fallbackHref: `${RELEASE_BASE_URL}/ProspectusAI.zip`,
    recommended: true,
  },
  {
    id: "windows-portable",
    title: "Windows Portable",
    platform: "Windows",
    description: "Zip package with bundled Node and Python runtime; no installation required.",
    href: `${RELEASE_BASE_URL}/ProspectusAI.zip`,
  },
  {
    id: "windows-targz",
    title: "Windows Archive",
    platform: "Windows",
    description: "Compressed Windows build for internal distribution mirrors.",
    href: `${RELEASE_BASE_URL}/ProspectusAI-windows-from-linux-20260510-1154.tar.gz`,
  },
  {
    id: "linux",
    title: "Linux x86_64",
    platform: "Linux",
    description: "Full Linux archive for workstation or server deployment.",
    href: `${RELEASE_BASE_URL}/ProspectusAI-linux-x86_64-20260509-0311.tar.gz`,
  },
];

export function getDownloadAsset(id: string): DownloadAsset | undefined {
  return DOWNLOAD_ASSETS.find((asset) => asset.id === id);
}
