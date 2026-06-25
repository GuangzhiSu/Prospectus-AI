export type DownloadAsset = {
  id: string;
  title: string;
  platform: string;
  description: string;
  href: string;
  recommended?: boolean;
};

const RELEASES_URL = "https://github.com/GuangzhiSu/Prospectus-AI/releases";

export const DOWNLOAD_ASSETS: DownloadAsset[] = [
  {
    id: "windows",
    title: "Windows Portable",
    platform: "Windows",
    description: "Portable package with bundled Node and Python runtime.",
    href: RELEASES_URL,
    recommended: true,
  },
  {
    id: "windows-targz",
    title: "Windows Archive",
    platform: "Windows",
    description: "Compressed Windows build for internal distribution mirrors.",
    href: RELEASES_URL,
  },
  {
    id: "linux",
    title: "Linux x86_64",
    platform: "Linux",
    description: "Full Linux archive for workstation or server deployment.",
    href: RELEASES_URL,
  },
];

export function getDownloadAsset(id: string): DownloadAsset | undefined {
  return DOWNLOAD_ASSETS.find((asset) => asset.id === id);
}
