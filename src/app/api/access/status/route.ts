import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { gatingEnabled, MCP_ACCESS, paymentsEnabled } from "@/lib/access";
import { loadBurns, loadGrants, loadPurchases } from "@/lib/checkout";
import { sessionFromRequest } from "@/lib/session";
import { solscanTxUrl } from "@/lib/solana-pay";

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

  const purchasesWithLinks = (purchases.rows || []).map((row) => {
    const p = row as { tx_signature?: string | null; chain?: string };
    return {
      ...p,
      explorerUrl: p.tx_signature && p.chain === "solana" ? solscanTxUrl(p.tx_signature) : null,
    };
  });
  const burnsWithLinks = (burns.rows || []).map((row) => {
    const b = row as { burn_tx?: string | null; verified?: boolean; chain?: string };
    return {
      ...b,
      explorerUrl: b.verified && b.burn_tx ? solscanTxUrl(b.burn_tx) : null,
    };
  });
  const verifiedBurns = burnsWithLinks.filter((r) => r.verified === true && Boolean(r.burn_tx));

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
      purchases: purchasesWithLinks,
      burns: burnsWithLinks,
      totals: {
        purchases: purchasesWithLinks.length,
        activeGrants: (grants.rows || []).filter((g) => (g as { status?: string }).status === "active").length,
        verifiedBurnEvents: verifiedBurns.length,
        verifiedBurnAmount: 0,
      },
      note: wallet
        ? "Paid grants appear after a Solscan payment to the treasury is verified. $ORBITX burns stay pending until we record the burn transaction. Live MCP remains public (auth none) unless gating is on."
        : "Submit a Solscan payment to unlock a paid grant. Sign in to attach it to this profile. MCP itself does not require a session.",
      errors: {
        purchases: purchases.error,
        grants: grants.error,
        burns: burns.error,
      },
    },
    { headers: { ...corsHeaders, ...limited.headers } },
  );
}
