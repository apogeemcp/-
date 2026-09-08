import type { Metadata } from "next";
import { Syne, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { ASSET_V, PRODUCT, publicSiteUrl } from "@/lib/site";

const syne = Syne({ subsets: ["latin"], variable: "--font-display" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

const title = `${PRODUCT.name} — ${PRODUCT.tag}`;
const description = `${PRODUCT.toolCount} Robinhood Chain tools for agents. Search, chart, desk, wallet tracking, analytics, pons launch via Phantom. Live MCP at https://apogeemcp.digital/api/mcp — add to Cursor, Claude, ChatGPT, or Grok.`;

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(publicSiteUrl()),
  icons: {
    icon: [{ url: `/brand/icon.png?v=${ASSET_V}`, type: "image/png" }],
    apple: [{ url: `/apple-touch-icon.png?v=${ASSET_V}` }],
    shortcut: [`/icon.png?v=${ASSET_V}`],
  },
  openGraph: {
    title: `${PRODUCT.name} MCP`,
    description: `${PRODUCT.tag}. Search. Chart. Desk. Launch. Indexed from pons on-chain.`,
    type: "website",
    images: [{ url: `/og.png?v=${ASSET_V}`, width: 1376, height: 768, alt: `${PRODUCT.name} — ${PRODUCT.tag}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PRODUCT.name} MCP`,
    description: PRODUCT.tag,
    images: [`/og.png?v=${ASSET_V}`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${instrument.variable} ${mono.variable}`}>
      <body className="font-body antialiased">
        <Providers>
          <Nav />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
