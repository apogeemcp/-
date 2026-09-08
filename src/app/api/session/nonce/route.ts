import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { isAddress } from "@/lib/chain";
import { issueNonce, originFromRequest, sessionConfigured } from "@/lib/session";

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
  if (!sessionConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Wallet session signing is not configured (APOGEE_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  const address = (req.nextUrl.searchParams.get("address") || "").toLowerCase();
  if (!isAddress(address)) {
    return NextResponse.json(
      { ok: false, error: "Provide a 0x address to bind the nonce." },
      { status: 400, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  const issued = await issueNonce(address, originFromRequest(req));
  return NextResponse.json(
    { ok: true, ...issued, expiresInSec: Math.floor((issued.exp - Date.now()) / 1000) },
    { headers: { ...corsHeaders, ...limited.headers } },
  );
}
