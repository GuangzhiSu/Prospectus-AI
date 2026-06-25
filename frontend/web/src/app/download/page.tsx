import Image from "next/image";
import Link from "next/link";

import { DOWNLOAD_ASSETS, type DownloadAsset } from "@/lib/download-assets";

export const metadata = {
  title: "Download Prospectus AI",
  description: "Download portable builds of Prospectus AI for Windows and Linux.",
};

type DisplayAsset = DownloadAsset & {
  downloadHref: string;
};

function getAssets(): DisplayAsset[] {
  return DOWNLOAD_ASSETS.map((asset) => ({
    ...asset,
    downloadHref: `/api/download/${asset.id}`,
  }));
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v11m0 0 4-4m-4 4-4-4M5 21h14" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export default function DownloadPage() {
  const assets = getAssets();
  const recommended = assets.find((asset) => asset.recommended) ?? assets[0];

  return (
    <main className="min-h-screen bg-[#f6f8f4] text-[#17201b]">
      <section className="relative overflow-hidden bg-[#16231d] text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/app-icon-512.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative mx-auto grid min-h-[620px] max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 md:grid-cols-[1fr_420px]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase text-[#dce8df]">
              Sponsor counsel drafting workspace
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              Prospectus AI
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#dce8df] md:text-lg">
              A desktop-ready AI workspace for transforming issuer files into prospectus evidence,
              section drafts, verification notes, and Word exports.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={recommended.downloadHref}
                className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] transition hover:bg-[#ffd36b]"
              >
                <DownloadIcon />
                Download for Windows
              </a>
              <Link
                href="/workspace"
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Open web workspace
                <ArrowIcon />
              </Link>
            </div>
          </div>

          <div className="border border-white/15 bg-[#f7faf6] p-5 text-[#17201b] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#d8ded6] pb-4">
              <Image src="/app-icon.png" alt="Prospectus AI icon" width={44} height={44} />
              <div>
                <p className="text-sm font-semibold">Current release</p>
                <p className="text-xs text-[#647064]">Portable builds from local distribution package</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#eef3ec] px-2 py-3">
                <p className="font-semibold">Agent1</p>
                <p className="mt-1 text-[#647064]">Evidence</p>
              </div>
              <div className="bg-[#eef3ec] px-2 py-3">
                <p className="font-semibold">Agent2</p>
                <p className="mt-1 text-[#647064]">Drafting</p>
              </div>
              <div className="bg-[#eef3ec] px-2 py-3">
                <p className="font-semibold">DOCX</p>
                <p className="mt-1 text-[#647064]">Export</p>
              </div>
            </div>
            <div className="mt-5 border-t border-[#d8ded6] pt-4">
              <p className="text-xs font-semibold uppercase text-[#6b735f]">Included</p>
              <ul className="mt-3 space-y-2 text-sm text-[#334139]">
                <li>Isolated AI module and web workspace</li>
                <li>Windows launch scripts and bundled runtime package</li>
                <li>Local file workflow for confidential issuer materials</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-6 flex flex-col justify-between gap-3 border-b border-[#d5ddd2] pb-5 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold">Downloads</h2>
            <p className="mt-2 text-sm text-[#637064]">
              Pick the package for your machine. Buttons download the published v0.1.0 release assets from GitHub.
            </p>
          </div>
          <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e] hover:underline">
            Configure model settings
            <ArrowIcon />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {assets.map((asset) => (
            <article key={asset.id} className="border border-[#d5ddd2] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-[#6b735f]">
                    {asset.platform}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{asset.title}</h3>
                </div>
                {asset.recommended && (
                  <span className="bg-[#e8f3ef] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                    Recommended
                  </span>
                )}
              </div>
              <p className="mt-3 min-h-12 text-sm leading-6 text-[#637064]">{asset.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-[#edf0eb] pt-4">
                <span className="text-sm font-medium text-[#334139]">Release page</span>
                <a
                  href={asset.downloadHref}
                  className="inline-flex h-10 items-center gap-2 bg-[#17201b] px-4 text-sm font-semibold text-white transition hover:bg-[#2b3a32]"
                >
                  <DownloadIcon />
                  Download
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#d5ddd2] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3">
          <div>
            <h2 className="text-xl font-semibold">Designed for controlled drafting</h2>
            <p className="mt-3 text-sm leading-6 text-[#637064]">
              The app keeps the main workflow local: upload issuer materials, prepare evidence,
              generate sections, then export a Word draft for review.
            </p>
          </div>
          <div className="md:border-l md:border-[#d5ddd2] md:pl-5">
            <p className="text-sm font-semibold">Workflow</p>
            <p className="mt-2 text-sm leading-6 text-[#637064]">
              Data upload, Agent1 evidence preparation, Agent2 section drafting, and DOCX export.
            </p>
          </div>
          <div className="md:border-l md:border-[#d5ddd2] md:pl-5">
            <p className="text-sm font-semibold">Deployment</p>
            <p className="mt-2 text-sm leading-6 text-[#637064]">
              Use the web workspace for development or download a portable build for distribution.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
