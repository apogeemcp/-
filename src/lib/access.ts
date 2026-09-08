import { PROJECT_CA } from "./site";

/** Live MCP is public. Token-gated access is config, not a fake shop. */
export function mcpGatingEnabled(): boolean {
  return process.env.APOGEE_MCP_GATING === "1";
}

export const MCP_ACCESS = {
  liveAuth: "none" as const,
  gatingEnabled: false,
  tokenTicker: "$ORBITX",
  projectContract: PROJECT_CA,
  burnVerified: false,
  note:
    "Apogee MCP is live with authentication none. A $ORBITX rental / permanent burn model is the published utility intent. It is not enabled: no burn amounts, no checkout, and no fake burn counter. The project contract is copy-only; this repo does not label a chain or explorer for it.",
} as const;

export type AccessKind = "rental" | "permanent";

export type AccessPlan = {
  id: string;
  kind: AccessKind;
  label: string;
  duration: string;
  seconds: number | null;
  live: boolean;
};

export const ACCESS_PLANS: AccessPlan[] = [
  { id: "rent-24h", kind: "rental", label: "24 Hours", duration: "24 hours", seconds: 86_400, live: false },
  { id: "rent-7d", kind: "rental", label: "7 Days", duration: "7 days", seconds: 7 * 86_400, live: false },
  { id: "rent-30d", kind: "rental", label: "30 Days", duration: "30 days", seconds: 30 * 86_400, live: false },
  { id: "rent-90d", kind: "rental", label: "90 Days", duration: "90 days", seconds: 90 * 86_400, live: false },
  { id: "rent-1y", kind: "rental", label: "1 Year", duration: "365 days", seconds: 365 * 86_400, live: false },
  { id: "permanent", kind: "permanent", label: "Permanent", duration: "Does not expire", seconds: null, live: false },
];

export const ACCESS_AUDIENCE = [
  { who: "AI agents", flow: "Connect MCP → request intel → analyze tokens → return results inside your app." },
  { who: "Trading platforms", flow: "Call market and token tools; render analytics in your own UI." },
  { who: "AI applications", flow: "Add Apogee tools to your agent; users never have to open apogeemcp.digital." },
  { who: "Wallets & portfolios", flow: "track_wallet is mark-to-market. Do not invent cost-basis PnL." },
  { who: "Research & analytics", flow: "scan_token, get_desk, holders proxies — labeled as samples when incomplete." },
] as const;

export const PARTNER_TYPES = [
  "AI platform",
  "Trading platform",
  "Wallet",
  "Analytics platform",
  "Developer tools",
  "AI agent",
  "Portfolio application",
  "Research platform",
  "Trading community",
  "Other Web3 infrastructure",
] as const;

export const USAGE_BANDS = ["Exploring", "Prototype", "Production < 1k req/day", "Production 1k–50k/day", "Unsure"] as const;
