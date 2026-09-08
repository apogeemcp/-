/**
 * Apogee MCP access catalog.
 *
 * List prices are backend-configurable (`APOGEE_ACCESS_PLANS` JSON).
 * Allocation is always 25% buy-and-burn / 75% ops of the USD list price.
 *
 * Live product: MCP `auth: none`. Purchased grants, payment capture, and
 * verified $ORBITX burns are NOT active until treasury + verifier exist.
 * Do not treat a frontend POST as proof of payment or access.
 */

import { PROJECT_CA } from "./site";

export const BURN_BPS = 2500;
export const OPS_BPS = 7500;

export type AccessKind = "rental" | "lifetime";

export type AccessPlan = {
  id: string;
  label: string;
  kind: AccessKind;
  durationHours: number | null;
  priceUsd: number;
  recommended?: boolean;
  cta: string;
  durationCopy: string;
};

export type AccessGrant = {
  planId: string;
  startsAt: string;
  expiresAt: string | null;
  lifetime: boolean;
};

export type PlanQuote = {
  plan: AccessPlan;
  burnUsd: number;
  opsUsd: number;
  burnBps: number;
  opsBps: number;
};

const DEFAULT_PLANS: AccessPlan[] = [
  {
    id: "day-1",
    label: "1 Day",
    kind: "rental",
    durationHours: 24,
    priceUsd: 100,
    cta: "GET 1 DAY ACCESS",
    durationCopy: "24-hour MCP access",
  },
  {
    id: "day-3",
    label: "3 Days",
    kind: "rental",
    durationHours: 72,
    priceUsd: 250,
    cta: "GET 3 DAYS",
    durationCopy: "72-hour MCP access",
  },
  {
    id: "week-1",
    label: "1 Week",
    kind: "rental",
    durationHours: 168,
    priceUsd: 500,
    recommended: true,
    cta: "GET 1 WEEK",
    durationCopy: "7-day MCP access",
  },
  {
    id: "month-1",
    label: "1 Month",
    kind: "rental",
    durationHours: 720,
    priceUsd: 2500,
    cta: "GET 1 MONTH",
    durationCopy: "30-day MCP access",
  },
  {
    id: "lifetime",
    label: "Lifetime",
    kind: "lifetime",
    durationHours: null,
    priceUsd: 5000,
    cta: "GET LIFETIME ACCESS",
    durationCopy: "Permanent MCP access",
  },
];

function parseEnvPlans(): AccessPlan[] | null {
  const raw = process.env.APOGEE_ACCESS_PLANS?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AccessPlan[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.priceUsd === "number" &&
        p.priceUsd > 0 &&
        (p.kind === "rental" || p.kind === "lifetime"),
    );
  } catch {
    return null;
  }
}

export function publishedPlans(): AccessPlan[] {
  return parseEnvPlans() ?? DEFAULT_PLANS;
}

export function getPlan(id: string): AccessPlan | undefined {
  return publishedPlans().find((p) => p.id === id);
}

export function allocateUsd(priceUsd: number): { burnUsd: number; opsUsd: number } {
  const burnUsd = Math.round(((priceUsd * BURN_BPS) / 10_000) * 100) / 100;
  const opsUsd = Math.round((priceUsd - burnUsd) * 100) / 100;
  return { burnUsd, opsUsd };
}

export function quotePlan(plan: AccessPlan): PlanQuote {
  return { plan, burnBps: BURN_BPS, opsBps: OPS_BPS, ...allocateUsd(plan.priceUsd) };
}

export function paymentsEnabled(): boolean {
  return process.env.APOGEE_PAYMENTS === "1" && Boolean(process.env.APOGEE_TREASURY_ADDRESS?.trim());
}

export function gatingEnabled(): boolean {
  return process.env.APOGEE_MCP_GATING === "1";
}

export function burnVerifierEnabled(): boolean {
  return Boolean(process.env.APOGEE_BURN_VERIFIER?.trim());
}

export function treasuryAddress(): string | null {
  const v = process.env.APOGEE_TREASURY_ADDRESS?.trim();
  return v || null;
}

export function expiresAtIso(plan: AccessPlan, from = new Date()): string | null {
  if (plan.kind === "lifetime" || plan.durationHours == null) return null;
  return new Date(from.getTime() + plan.durationHours * 3600_000).toISOString();
}

export function remainingCopy(expiresAt: string | null, now = Date.now()): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "EXPIRED";
  const hours = Math.floor(ms / 3600_000);
  if (hours < 48) {
    const h = Math.max(1, hours);
    return `${h} HOUR${h === 1 ? "" : "S"} REMAINING`;
  }
  const days = Math.floor(hours / 24);
  return `${days} DAY${days === 1 ? "" : "S"} REMAINING`;
}

export const PLAN_INCLUDES = [
  "Full MCP tool access according to current permissions (today: public, auth none)",
  "Developer documentation",
  "Integration access to the live MCP endpoint",
  "Usage monitoring where telemetry is configured",
] as const;

export const TOOL_GROUPS = [
  "CORE DATA",
  "MARKET INTELLIGENCE",
  "TOKEN ANALYTICS",
  "WALLET INTELLIGENCE",
  "TRADING TOOLS",
  "ADVANCED AGENT TOOLS",
] as const;

export type ToolGroup = (typeof TOOL_GROUPS)[number];

/** Reserved matrix. Today every listed tool is public; groups are documentation only. */
export function toolPermissionMatrix(): Record<string, { group: ToolGroup; requirement: "public" }> {
  return {};
}

export const ACCESS_AUDIENCE = [
  { who: "Developers", flow: "Add the canonical MCP URL to Cursor, Claude, or a custom client. Tools are public today." },
  { who: "AI agents", flow: "Hosts call tools/list then tools/call. The model only sees data after a tool result." },
  { who: "Applications", flow: "Backend or browser POSTs Streamable HTTP or REST /api/v1/<tool>." },
  { who: "Trading platforms", flow: "Read desk, quotes, and token analytics. Execution still happens in the user’s wallet." },
  { who: "Wallets", flow: "Surface Robinhood Chain marks and scans without re-indexing the chain." },
  { who: "Analytics platforms", flow: "Reuse listed tools instead of rebuilding DexScreener/Gecko/RPC glue." },
] as const;

export const PARTNER_TYPES = [
  "Wallets",
  "Trading platforms",
  "AI platforms",
  "AI agents",
  "Analytics platforms",
  "Web3 applications",
  "Developer infrastructure",
  "Research platforms",
] as const;

export const USAGE_BANDS = [
  "Exploring",
  "Prototype",
  "Production (interactive)",
  "High volume — discuss",
] as const;

export const MCP_ACCESS = {
  liveAuth: "none" as const,
  liveStatus: "public" as const,
  tokenTicker: "$ORBITX",
  projectContract: PROJECT_CA,
  burnBps: BURN_BPS,
  opsBps: OPS_BPS,
  note: "MCP is public (auth none). The USD catalog below is the official list price if paid access ships. Checkout cannot complete until a treasury address and on-chain verifier exist. Burned totals stay at zero until a verified burn signature is stored.",
  burnProcess:
    "Buy-and-burn is not automated. After a purchase is confirmed on-chain, 25% of the USD list price is allocated to buying $ORBITX and burning it. The UI may say Burned only after a verified transaction signature is recorded. Until a treasury address and verifier are configured, purchases cannot complete and burn totals remain zero.",
} as const;

export type PurchaseState =
  | "select_plan"
  | "connect_wallet"
  | "verify_wallet"
  | "breakdown"
  | "waiting_wallet"
  | "awaiting_confirmation"
  | "transaction_submitted"
  | "confirming"
  | "purchase_confirmed"
  | "access_activated"
  | "buy_burn_processing"
  | "burn_verified"
  | "complete"
  | "rejected"
  | "expired"
  | "failed"
  | "insufficient_balance"
  | "transaction_not_found"
  | "burn_verification_failed"
  | "unavailable";

export function checkoutBlocker(): { state: "unavailable"; reason: string } | null {
  if (!paymentsEnabled()) {
    return {
      state: "unavailable",
      reason:
        "Payment rail is not configured (APOGEE_PAYMENTS and APOGEE_TREASURY_ADDRESS). List prices are shown for transparency. No funds can be collected and no access grant can be activated from this site.",
    };
  }
  if (!burnVerifierEnabled()) {
    return {
      state: "unavailable",
      reason:
        "A treasury address is set but the on-chain payment and burn verifier is not deployed (APOGEE_BURN_VERIFIER). Checkout will not collect payment or mark burns as verified.",
    };
  }
  return null;
}

export function publicCatalogPayload() {
  const plans = publishedPlans().map((plan) => quotePlan(plan));
  const blocker = checkoutBlocker();
  return {
    ok: true,
    live: {
      auth: MCP_ACCESS.liveAuth,
      status: MCP_ACCESS.liveStatus,
      gating: gatingEnabled(),
      payments: paymentsEnabled(),
      burnVerifier: burnVerifierEnabled(),
      checkout: blocker ? "unavailable" : "configured",
    },
    burnBps: BURN_BPS,
    opsBps: OPS_BPS,
    tokenTicker: MCP_ACCESS.tokenTicker,
    projectContract: MCP_ACCESS.projectContract,
    burnProcess: MCP_ACCESS.burnProcess,
    includes: PLAN_INCLUDES,
    toolGroups: TOOL_GROUPS,
    toolGroupNote: "Reserved for future per-tool permissions. Live MCP does not gate tools by group.",
    plans,
    blocker,
  };
}
