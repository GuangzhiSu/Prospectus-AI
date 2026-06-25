export type DownloadAsset = {
  id: string;
  title: string;
  platform: string;
  description: string;
  href: string;
  recommended?: boolean;
};

export const DOWNLOAD_ASSETS: DownloadAsset[] = [
  {
    id: "windows",
    title: "Windows Portable",
    platform: "Windows",
    description: "Portable package with bundled Node and Python runtime.",
    href: "https://github.com/GuangzhiSu/Prospectus-AI/releases",
    recommended: true,
  },
  {
    id: "windows-targz",
    title: "Windows Archive",
    platform: "Windows",
    description: "Compressed Windows build for internal distribution mirrors.",
    href: "https://github.com/GuangzhiSu/Prospectus-AI/releases",
  },
  {
    id: "linux",
    title: "Linux x86_64",
    platform: "Linux",
    description: "Full Linux archive for workstation or server deployment.",
    href: "https://github.com/GuangzhiSu/Prospectus-AI/releases",
  },
];

export function getDownloadAsset(id: string): DownloadAsset | undefined {
  return DOWNLOAD_ASSETS.find((asset) => asset.id === id);
}
