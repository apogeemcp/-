import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Sora, IBM_Plex_Mono, Great_Vibes } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { SkipToContent } from "@/components/SkipToContent";
import { SpaceLayer } from "@/components/SpaceLayer";
import { ASSET_V, PRODUCT, publicSiteUrl } from "@/lib/site";

const display = Cinzel({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700"] });
const heading = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});
const body = Sora({ subsets: ["latin"], variable: "--font-body", weight: ["300", "400", "500", "600"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
const script = Great_Vibes({ subsets: ["latin"], variable: "--font-script", weight: ["400"] });

const title = `${PRODUCT.name} — ${PRODUCT.tag}`;
const description = `${PRODUCT.toolCount} Robinhood Chain tools for agents. Search, chart, desk, wallet tracking, analytics, pons launch via Phantom. Live MCP at https://apogeemcp.digital/api/mcp — add to Cursor, Claude, ChatGPT, or Grok.`;

export const metadata: Metadata = {
  title: {
    default: title,
    template: `%s — ${PRODUCT.name}`,
  },
  description,
  metadataBase: new URL(publicSiteUrl()),
  icons: {
    icon: [
      { url: `/icons/icon-192.png?v=${ASSET_V}`, type: "image/png", sizes: "192x192" },
      { url: `/icons/icon-512.png?v=${ASSET_V}`, type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: `/apple-touch-icon.png?v=${ASSET_V}` }],
    shortcut: [`/icons/icon-192.png?v=${ASSET_V}`],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: PRODUCT.name,
  },
  openGraph: {
    title: `${PRODUCT.name} MCP`,
    description: `${PRODUCT.tag}. Search. Chart. Desk. Launch. Indexed from pons on-chain.`,
    type: "website",
    images: [{ url: `/og.webp?v=${ASSET_V}`, width: 1200, height: 800, alt: `${PRODUCT.name} — ${PRODUCT.tag}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PRODUCT.name} MCP`,
    description: PRODUCT.tag,
    images: [`/og.webp?v=${ASSET_V}`],
  },
};

export const viewport: Viewport = {
  themeColor: "#05040a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${heading.variable} ${body.variable} ${mono.variable} ${script.variable}`}>
      <body className="font-body antialiased">
        <Providers>
          <SkipToContent />
          <SpaceLayer />
          <Nav />
          <div id="main-content">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
