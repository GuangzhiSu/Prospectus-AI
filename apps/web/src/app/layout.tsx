import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
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
  title: "HKEX Prospectus AI | Sponsor Counsel Drafting",
  description: "AI-assisted prospectus drafting for HKEX technology-sector IPOs. Agent1 (Excel → RAG) → Agent2 (sections).",
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
      </body>
    </html>
  );
}
