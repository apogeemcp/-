import type { Metadata } from "next";
import { Syne, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const syne = Syne({ subsets: ["latin"], variable: "--font-display" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Apogee — Robinhood Chain MCP",
  description:
    "Apogee is Robinhood Chain intel for agents. Search. Chart. Desk. Launch. Live pons indexing. No login — add the MCP to any AI app.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  icons: {
    icon: [{ url: "/brand/icon.png?v=3", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png?v=3" }],
    shortcut: ["/icon.png?v=3"],
  },
  openGraph: {
    title: "Apogee MCP",
    description: "Robinhood Chain intel for agents. Search. Chart. Desk. Launch. Indexed from pons on-chain.",
    type: "website",
    images: [{ url: "/og.png?v=3", width: 1376, height: 768, alt: "Apogee — Robinhood Chain intel for agents" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Apogee MCP",
    description: "Robinhood Chain intel for agents.",
    images: ["/og.png?v=3"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${instrument.variable} ${mono.variable}`}>
      <body className="font-body antialiased">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
