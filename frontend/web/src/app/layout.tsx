import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-prospectus.com"),
  title: {
    default: "AI Prospectus | Private AI document generation",
    template: "%s | AI Prospectus",
  },
  description:
    "Private AI document generation for legal, financial, and regulated drafting workflows.",
  openGraph: {
    title: "AI Prospectus",
    description:
      "Turn proprietary deal materials into structured evidence, regulated drafts, and exportable documents.",
    url: "https://ai-prospectus.com",
    siteName: "AI Prospectus",
    images: [{ url: "/app-icon-512.png", width: 512, height: 512, alt: "AI Prospectus" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AI Prospectus",
    description:
      "Private AI document generation for legal, financial, and regulated drafting workflows.",
    images: ["/app-icon-512.png"],
  },
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${mono.variable} ${serif.variable} font-sans antialiased`}>
        {children}
        <UpdatePrompt />
      </body>
    </html>
  );
}
