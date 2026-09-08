import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { gatingEnabled, MCP_ACCESS, paymentsEnabled } from "@/lib/access";
import { loadBurns, loadGrants, loadPurchases } from "@/lib/checkout";
import { sessionFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) {
    const res = limited.response;
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
  const session = sessionFromRequest(req);
  const wallet = session?.address || null;
  const [purchases, grants, burns] = wallet
    ? await Promise.all([loadPurchases(wallet), loadGrants(wallet), loadBurns(wallet)])
    : [
        { ok: true, rows: [] as unknown[], error: undefined },
        { ok: true, rows: [] as unknown[], error: undefined },
        { ok: true, rows: [] as unknown[], error: undefined },
      ];

  const verifiedBurns = (burns.rows || []).filter((row) => {
    const r = row as { verified?: boolean; burn_tx?: string };
    return r.verified === true && Boolean(r.burn_tx);
  });

  return NextResponse.json(
    {
      ok: true,
      wallet,
      verified: Boolean(session),
      mcp: {
        auth: MCP_ACCESS.liveAuth,
        status: MCP_ACCESS.liveStatus,
        gating: gatingEnabled(),
        payments: paymentsEnabled(),
      },
      purchasedAccess: (grants.rows || []).filter((g) => (g as { status?: string }).status === "active"),
      grants: grants.rows,
      purchases: purchases.rows,
      burns: burns.rows,
      totals: {
        purchases: (purchases.rows || []).length,
        activeGrants: (grants.rows || []).filter((g) => (g as { status?: string }).status === "active").length,
        verifiedBurnEvents: verifiedBurns.length,
        verifiedBurnAmount: 0,
      },
      note: wallet
        ? "Purchased MCP grants stay empty until a verified payment activates one. Live MCP remains public (auth none)."
        : "Connect and sign with Phantom (Ethereum mode) to load wallet-scoped quotes. MCP itself does not require a session.",
      errors: {
        purchases: purchases.error,
        grants: grants.error,
        burns: burns.error,
      },
    },
    { headers: { ...corsHeaders, ...limited.headers } },
  );
}
