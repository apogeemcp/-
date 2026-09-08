import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { createCheckoutQuote } from "@/lib/checkout";
import { paymentTreasury } from "@/lib/solana-pay";
import { sessionFromRequest } from "@/lib/session";

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
    return NextResponse.json(
      {
        ...result,
        treasury: paymentTreasury(),
        assets: ["SOL", "USDC"],
        warning: "Server prices only. Send SOL or USDC yourself, then confirm with a Solscan link.",
      },
      { status: result.ok ? 200 : 503, headers: { ...corsHeaders, ...limited.headers } },
    );
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { ok: false, state: "failed", error: e instanceof Error ? e.message : String(e) },
      { status, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
}
