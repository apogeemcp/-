import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { createCheckoutQuote } from "@/lib/checkout";
import { sessionFromRequest } from "@/lib/session";
import { sbInsert } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) {
    const res = limited.response;
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
  const body = (await req.json().catch(() => ({}))) as { planId?: unknown };
  const session = sessionFromRequest(req);
  try {
    const result = await createCheckoutQuote({
      planId: body.planId,
      wallet: session?.address || null,
    });
    void sbInsert("apogee_product_events", {
      event: "checkout_attempt",
      wallet: session?.address || null,
      meta: { planId: body.planId, state: result.state },
    });
    return NextResponse.json(
      {
        ...result,
        warning:
          "Server prices only. Client-submitted amounts are ignored. This response is not a purchase confirmation.",
      },
      { status: 503, headers: { ...corsHeaders, ...limited.headers } },
    );
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { ok: false, state: "failed", error: e instanceof Error ? e.message : String(e) },
      { status, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
}
