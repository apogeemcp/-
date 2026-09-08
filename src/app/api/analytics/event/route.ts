import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { sessionFromRequest } from "@/lib/session";
import { sbInsert, supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["plan_view", "role_selected", "hub_open", "docs_open", "checkout_open"]);

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) {
    const res = limited.response;
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
  if (!supabaseAdmin()) {
    return NextResponse.json({ ok: true, stored: false }, { headers: { ...corsHeaders, ...limited.headers } });
  }
  const body = (await req.json().catch(() => ({}))) as { event?: string; meta?: unknown };
  const event = String(body.event || "");
  if (!ALLOWED.has(event)) {
    return NextResponse.json({ ok: false, error: "Unknown event." }, { status: 400, headers: { ...corsHeaders, ...limited.headers } });
  }
  const session = sessionFromRequest(req);
  await sbInsert("apogee_product_events", {
    event,
    wallet: session?.address || null,
    meta: body.meta && typeof body.meta === "object" ? body.meta : {},
  });
  return NextResponse.json({ ok: true, stored: true }, { headers: { ...corsHeaders, ...limited.headers } });
}
