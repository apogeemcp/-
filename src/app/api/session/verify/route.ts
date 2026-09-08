import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { auditEvent, sbRest, supabaseAdmin } from "@/lib/supabase-admin";
import {
  issueSession,
  sessionConfigured,
  sessionCookieHeader,
  verifyWalletSignature,
} from "@/lib/session";

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
  if (!sessionConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Wallet session signing is not configured." },
      { status: 503, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  const body = (await req.json().catch(() => ({}))) as {
    address?: string;
    message?: string;
    signature?: string;
    nonce?: string;
  };
  const result = await verifyWalletSignature({
    address: String(body.address || ""),
    message: String(body.message || ""),
    signature: String(body.signature || ""),
    nonce: String(body.nonce || ""),
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 401, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  const { token, exp } = issueSession(result.address);
  if (supabaseAdmin()) {
    await sbRest(
      `apogee_wallet_identities?address=eq.${encodeURIComponent(result.address)}&chain=eq.eip155`,
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          address: result.address,
          chain: "eip155",
          wallet_type: "phantom-ethereum",
          verified: true,
          verified_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
        }),
      },
    ).catch(() => {});
    await auditEvent("wallet_verified", { address: result.address, chain: "eip155" });
  }
  const res = NextResponse.json(
    {
      ok: true,
      address: result.address,
      chain: "eip155",
      verified: true,
      expiresAt: new Date(exp).toISOString(),
    },
    { headers: { ...corsHeaders, ...limited.headers } },
  );
  res.headers.append("Set-Cookie", sessionCookieHeader(token, exp));
  return res;
}
