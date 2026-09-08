import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { submitSolscanPayment } from "@/lib/checkout";
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
  const body = (await req.json().catch(() => ({}))) as { planId?: unknown; solscan?: unknown; tx?: unknown };
  const session = sessionFromRequest(req);
  try {
    const result = await submitSolscanPayment({
      planId: body.planId,
      solscan: body.solscan || body.tx,
      wallet: session?.address || null,
    });
    const status = result.ok ? 200 : result.state === "transaction_not_found" ? 404 : 400;
    return NextResponse.json(result, { status, headers: { ...corsHeaders, ...limited.headers } });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { ok: false, state: "failed", error: e instanceof Error ? e.message : String(e) },
      { status, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
}
