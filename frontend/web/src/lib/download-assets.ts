import { APP_RELEASE_TAG } from "@/lib/app-version";

export type DownloadAsset = {
  id: string;
  title: string;
  platform: string;
  description: string;
  href: string;
  fallbackHref?: string;
  dynamicAssetPattern?: string;
  recommended?: boolean;
};

export const RELEASE_TAG = APP_RELEASE_TAG;
export const RELEASE_LABEL = RELEASE_TAG.startsWith("v") ? RELEASE_TAG : `v${RELEASE_TAG}`;

const RELEASE_BASE_URL =
  `https://github.com/GuangzhiSu/Prospectus-AI/releases/download/${RELEASE_TAG}`;
const RELEASE_PAGE_URL =
  `https://github.com/GuangzhiSu/Prospectus-AI/releases/tag/${RELEASE_TAG}`;
const PUBLIC_TEST_DATASET_ASSET = "ProspectusAI-test-dataset.zip";

export const RELEASE_API_URL =
  `https://api.github.com/repos/GuangzhiSu/Prospectus-AI/releases/tags/${RELEASE_TAG}`;

export const DOWNLOAD_ASSETS: DownloadAsset[] = [
  {
    id: "windows",
    title: "Windows Installer",
    platform: "Windows",
    description: "Standard installer that creates Start Menu and optional desktop shortcuts.",
    href: `${RELEASE_BASE_URL}/ProspectusAI-Setup-${RELEASE_TAG.replace(/^v/i, "")}.exe`,
    fallbackHref: `${RELEASE_BASE_URL}/ProspectusAI-windows-x86_64.zip`,
    recommended: true,
  },
  {
    id: "macos-arm64",
    title: "macOS Apple Silicon",
    platform: "macOS",
    description: "Standalone DMG for Apple Silicon Macs.",
    href: RELEASE_PAGE_URL,
    fallbackHref: RELEASE_PAGE_URL,
    dynamicAssetPattern: "^ProspectusAI-mac-arm64-.*\\.dmg$",
  },
  {
    id: "macos-x64",
    title: "macOS Intel",
    platform: "macOS",
    description: "Standalone DMG for Intel Macs.",
    href: RELEASE_PAGE_URL,
    fallbackHref: RELEASE_PAGE_URL,
    dynamicAssetPattern: "^ProspectusAI-mac-x64-.*\\.dmg$",
  },
  {
    id: "linux",
    title: "Linux x86_64",
    platform: "Linux",
    description: "Full Linux archive for workstation or server deployment.",
    href: RELEASE_PAGE_URL,
    fallbackHref: RELEASE_PAGE_URL,
    dynamicAssetPattern: "^ProspectusAI-linux-x86_64-.*\\.tar\\.gz$",
  },
  {
    id: "test-dataset",
    title: "Test Dataset",
    platform: "Dataset",
    description: "Sample reverse-engineered inputs, source packages, section texts, and prospectus PDFs for end-to-end testing.",
    href: `${RELEASE_BASE_URL}/${PUBLIC_TEST_DATASET_ASSET}`,
    fallbackHref: RELEASE_PAGE_URL,
  },
];

export function getDownloadAsset(id: string): DownloadAsset | undefined {
  return DOWNLOAD_ASSETS.find((asset) => asset.id === id);
}
