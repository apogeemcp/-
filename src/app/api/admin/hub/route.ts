import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { MCP_ACCESS } from "@/lib/access";
import { supabaseAdmin, sbRest } from "@/lib/supabase-admin";
import { usageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";

function adminOk(req: NextRequest): boolean {
  const secret = process.env.APOGEE_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-apogee-admin") || "";
  const bearer = req.headers.get("authorization") || "";
  const token = header || (bearer.startsWith("Bearer ") ? bearer.slice(7) : "");
  return token === secret;
}

export async function GET(req: NextRequest) {
  if (!process.env.APOGEE_ADMIN_SECRET?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Admin dashboard is not configured (APOGEE_ADMIN_SECRET)." },
      { status: 503, headers: corsHeaders },
    );
  }
  if (!adminOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401, headers: corsHeaders });
  }
  const usage = await usageSummary();
  const admin = supabaseAdmin();
  const empty = { count: 0, rows: [] as unknown[] };
  async function table(path: string) {
    if (!admin) return { ...empty, error: "service role missing" };
    const res = await sbRest<unknown[]>(path);
    return { count: Array.isArray(res.data) ? res.data.length : 0, rows: res.data || [], error: res.error };
  }
  const [partners, purchases, grants, burns, support, events] = await Promise.all([
    table("apogee_partner_requests?select=id,company,status,created_at,integration_type&order=created_at.desc&limit=50"),
    table("apogee_mcp_purchases?select=id,status,price_usd,burn_usd,plan_id,created_at&order=created_at.desc&limit=50"),
    table("apogee_access_grants?select=id,status,lifetime,expires_at,plan_id&limit=50"),
    table("apogee_burn_records?select=id,status,verified,allocation_usd,burn_tx&limit=50"),
    table("apogee_support_requests?select=id,topic,status,created_at&order=created_at.desc&limit=50"),
    table("apogee_product_events?select=event,created_at&order=created_at.desc&limit=100"),
  ]);

  const confirmedPurchases = (purchases.rows as Array<{ status?: string; price_usd?: number }>).filter((p) => p.status === "confirmed");
  const verifiedBurns = (burns.rows as Array<{ verified?: boolean; burn_tx?: string }>).filter((b) => b.verified && b.burn_tx);

  return NextResponse.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      mcp: { auth: MCP_ACCESS.liveAuth, status: MCP_ACCESS.liveStatus },
      revenue: {
        totalUsd: confirmedPurchases.reduce((s, p) => s + Number(p.price_usd || 0), 0),
        confirmedPurchases: confirmedPurchases.length,
        quotedOnly: (purchases.rows as Array<{ status?: string }>).filter((p) => p.status === "quoted").length,
        note: "Quoted rows are not revenue. Confirmed stays 0 until an on-chain verifier exists.",
      },
      access: {
        activeRentals: (grants.rows as Array<{ status?: string; lifetime?: boolean }>).filter((g) => g.status === "active" && !g.lifetime).length,
        lifetime: (grants.rows as Array<{ lifetime?: boolean; status?: string }>).filter((g) => g.lifetime && g.status === "active").length,
        expiring: (grants.rows as Array<{ expires_at?: string; status?: string }>).filter((g) => {
          if (g.status !== "active" || !g.expires_at) return false;
          const ms = new Date(g.expires_at).getTime() - Date.now();
          return ms > 0 && ms < 7 * 86400_000;
        }).length,
      },
      orbitx: {
        allocatedUsd: 0,
        purchasedUsd: 0,
        burnedVerified: verifiedBurns.length,
        pending: (burns.rows as Array<{ status?: string }>).filter((b) => b.status === "pending").length,
        failed: (burns.rows as Array<{ status?: string }>).filter((b) => b.status === "failed").length,
        note: "Burned counts only include rows with verified=true and a burn transaction signature.",
      },
      partners: {
        pending: (partners.rows as Array<{ status?: string }>).filter((p) => p.status === "pending").length,
        rows: partners.rows,
      },
      support: { open: (support.rows as Array<{ status?: string }>).filter((s) => s.status === "open").length, rows: support.rows },
      payments: purchases,
      usage,
      productEvents: events,
    },
    { headers: corsHeaders },
  );
}
