import { CHAIN } from "./chain";

export const CANONICAL_ORIGIN = "https://apogeemcp.digital";
export const CANONICAL_MCP = `${CANONICAL_ORIGIN}/api/mcp`;
export const CANONICAL_MCP_ALIAS = `${CANONICAL_ORIGIN}/mcp`;

function vercelHost(): string | undefined {
  const raw =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
      : process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!raw) return undefined;
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function b64json(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof Buffer !== "undefined") return Buffer.from(json).toString("base64");
  return btoa(json);
}

export function publicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "preview") {
    const host = vercelHost();
    if (host) return `https://${host}`;
  }
  return CANONICAL_ORIGIN;
}

export function supabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://paxtohwiycuhwmlziwrr.supabase.co").replace(/\/$/, "");
}

export function supabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBheHRvaHdpeWN1aHdtbHppd3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTEzNjMsImV4cCI6MjA5NjY4NzM2M30.HtHcTkUO35c_4WTjufHRHUhAHPDuATw23bqh39D_qkQ"
  );
}

export function mcpHttpUrl(): string {
  if (process.env.NEXT_PUBLIC_MCP_URL) return process.env.NEXT_PUBLIC_MCP_URL;
  return CANONICAL_MCP;
}

export function restApiUrl(): string {
  return `${publicSiteUrl()}/api/v1`;
}

export function cursorConfig() {
  return {
    mcpServers: {
      apogee: { url: mcpHttpUrl() },
    },
  };
}

export function cursorRemoteSupabase() {
  const headers: Record<string, string> = {};
  const key = supabaseAnonKey();
  if (key) {
    headers.Authorization = `Bearer ${key}`;
    headers.apikey = key;
  }
  return {
    mcpServers: {
      apogee: {
        url: `${supabaseUrl()}/functions/v1/apogee-mcp`,
        ...(Object.keys(headers).length ? { headers } : {}),
      },
    },
  };
}

export function claudeDesktopConfig() {
  return cursorConfig();
}

export function installLinks() {
  const url = mcpHttpUrl();
  const cursorCfg = b64json({ url });
  const vscode = encodeURIComponent(JSON.stringify({ name: "apogee", type: "http", url }));
  return {
    url,
    alias: `${publicSiteUrl()}/mcp`,
    cursor: `cursor://anysphere.cursor-deeplink/mcp/install?name=apogee&config=${cursorCfg}`,
    vscode: `vscode:mcp/install?${vscode}`,
    claude: `https://claude.ai/settings/connectors`,
    chatgpt: `https://chatgpt.com/#settings/Connectors`,
    grok: `https://grok.com/manage-connectors`,
    claudeCode: `claude mcp add --transport http apogee ${url}`,
    json: JSON.stringify(cursorConfig(), null, 2),
    toml: `[mcp_servers.apogee]\nurl = "${url}"`,
  };
}

export const HOSTS = [
  { id: "cursor", name: "Cursor", file: ".cursor/mcp.json", hint: "One-click install, or Settings → MCP" },
  { id: "claude", name: "Claude", file: "Connectors", hint: "Settings → Connectors → Add custom connector" },
  { id: "chatgpt", name: "ChatGPT", file: "Apps & Connectors", hint: "Enable Developer Mode, then Add connector" },
  { id: "grok", name: "Grok", file: "Connectors", hint: "grok.com → Connectors → Add custom connector" },
  { id: "claude-code", name: "Claude Code", file: "CLI", hint: "claude mcp add --transport http apogee <url>" },
  { id: "vscode", name: "VS Code", file: ".vscode/mcp.json", hint: "MCP: Add Server" },
  { id: "windsurf", name: "Windsurf", file: "~/.codeium/windsurf/mcp_config.json", hint: "Windsurf MCP settings" },
  { id: "codex", name: "Codex CLI", file: "~/.codex/config.toml", hint: "[mcp_servers.apogee] url = ..." },
] as const;

export const ASSET_V = "6";

export function asset(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${p}?v=${ASSET_V}`;
}

export const PRODUCT = {
  name: "Apogee",
  tag: "Robinhood Chain intel for agents",
  version: "2.0.0",
  toolCount: 3000,
  chain: CHAIN,
  pillars: [
    { name: "Search", href: "/dashboard", blurb: "Tickers, contracts, and canonical Stock Tokens — resolve by address." },
    { name: "Chart", href: "/dashboard", blurb: "GeckoTerminal candles on the robinhood slug, not chain id 4663." },
    { name: "Desk", href: "/dashboard", blurb: "Trending pools, TVL, and RHJ oracle vs DEX premium." },
    { name: "Launch", href: "/launches", blurb: "On-chain pons v1/v2. Phantom signs unsigned v2 txs locally." },
    { name: "Track", href: "/wallet", blurb: "Wallet mark-to-market, explorer flow, and analytics proxies." },
  ],
} as const;

export const LEGAL = {
  updated: "September 8, 2026",
  affiliation:
    "Apogee is unaffiliated with Robinhood Markets, Inc., Robinhood Crypto, Robinhood Assets (Jersey) Ltd, and pons.",
  stock:
    "Stock Tokens are tokenised debt securities that may not be offered, sold, or delivered to persons in the United States, Canada, the United Kingdom, or Switzerland.",
  pons:
    "Write pons lowercase and link https://www.ponsfamily.com/launchpad. Apogee indexes public factory logs; it does not operate pons, is not a partner, and does not endorse any launch. Graduation is not a quality signal.",
  keys:
    "Never paste a seed phrase or private key. Wallet connect uses Phantom (or any EIP-1193 provider) locally. prepare_pons_launch returns an unsigned transaction — you sign it. Apogee does not broadcast unless you sign. Most tools are read-only; launch helpers are not.",
  data:
    "Market data comes from public RPC, DexScreener, GeckoTerminal, DefiLlama, RHJ Stock Token APIs, and on-chain pons reads. It can be delayed, incomplete, or wrong. Tickers collide — resolve by contract.",
  disclaimer:
    "Apogee provides software, data and developer infrastructure. Blockchain and market data can be incomplete, delayed or inaccurate. AI-generated output may contain errors. Nothing on the platform should be interpreted as financial, legal or investment advice.",
  counsel:
    "Legal pages describe how the software is offered. They are not legal advice. Have qualified counsel review them before treating them as a binding contract.",
  mcp: CANONICAL_MCP,
  alias: CANONICAL_MCP_ALIAS,
};

export const TABS = [
  { href: "/", label: "Home", hint: "Orbit" },
  { href: "/dashboard", label: "Desk", hint: "Scan" },
  { href: "/launches", label: "Launch", hint: "pons" },
  { href: "/orbit", label: "Orbit", hint: "AI" },
  { href: "/wallet", label: "Profile", hint: "Wallet" },
] as const;

export const MORE_LINKS = [
  { href: "/developers", label: "Developers" },
  { href: "/connect", label: "Connect MCP" },
  { href: "/analytics", label: "Analytics" },
  { href: "/about", label: "About" },
  { href: "/guides", label: "Guides" },
  { href: "/faq", label: "FAQ" },
  { href: "/whitepaper", label: "Whitepaper" },
  { href: "/docs", label: "MCP tools" },
  { href: "/links", label: "Links" },
  { href: "/usage", label: "Usage" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export const COMMUNITY = {
  telegram: "https://t.me/orbitxwrld",
  x: "https://x.com/apogeemcp",
  website: CANONICAL_ORIGIN,
  github: "https://github.com/apogeemcp/-",
} as const;

export const PROJECT_CA = "13H4WJvGEg4xrrBwWn2vsQgz7xhmhxgNdw19i1QsxPX9";

export const FOOTER = {
  line: "AI × MARKET INTELLIGENCE × MCP",
  platform: [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Desk" },
    { href: "/launches", label: "Launch" },
    { href: "/orbit", label: "Orbit" },
    { href: "/analytics", label: "Analytics" },
  ],
  resources: [
    { href: "/developers", label: "Developers" },
    { href: "/developers/access", label: "MCP access" },
    { href: "/developers/partners", label: "Partners" },
    { href: "/about", label: "About" },
    { href: "/guides", label: "Guides" },
    { href: "/faq", label: "FAQ" },
    { href: "/whitepaper", label: "Whitepaper" },
    { href: "/docs", label: "MCP tools" },
  ],
  legal: [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/data-usage", label: "Data usage" },
    { href: "/availability", label: "Availability" },
  ],
} as const;
