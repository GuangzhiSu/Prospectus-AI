export type DownloadAsset = {
  id: string;
  title: string;
  platform: string;
  description: string;
  filePath: string;
  filename: string;
  mimeType: string;
  recommended?: boolean;
};

export const DOWNLOAD_ASSETS: DownloadAsset[] = [
  {
    id: "windows",
    title: "Windows Portable",
    platform: "Windows",
    description: "Portable package with bundled Node and Python runtime.",
    filePath: "dist/ProspectusAI.zip",
    filename: "ProspectusAI-windows-portable.zip",
    mimeType: "application/zip",
    recommended: true,
  },
  {
    id: "windows-targz",
    title: "Windows Archive",
    platform: "Windows",
    description: "Compressed Windows build for internal distribution mirrors.",
    filePath: "dist/ProspectusAI-windows-from-linux-20260510-1154.tar.gz",
    filename: "ProspectusAI-windows-20260510.tar.gz",
    mimeType: "application/gzip",
  },
  {
    id: "linux",
    title: "Linux x86_64",
    platform: "Linux",
    description: "Full Linux archive for workstation or server deployment.",
    filePath: "dist/ProspectusAI-linux-x86_64-20260509-0311.tar.gz",
    filename: "ProspectusAI-linux-x86_64-20260509.tar.gz",
    mimeType: "application/gzip",
  },
];

export function getDownloadAsset(id: string): DownloadAsset | undefined {
  return DOWNLOAD_ASSETS.find((asset) => asset.id === id);
}
