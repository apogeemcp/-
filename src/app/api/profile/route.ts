import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { sessionFromRequest } from "@/lib/session";
import { sbInsert, sbRest, supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const ROLES = new Set(["trader", "developer"]);

export async function GET(req: NextRequest) {
  const session = sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: true, verified: false, profile: null }, { headers: corsHeaders });
  }
  if (!supabaseAdmin()) {
    return NextResponse.json(
      { ok: true, verified: true, address: session.address, profile: null, note: "Profile storage requires service role." },
      { headers: corsHeaders },
    );
  }
  const found = await sbRest<Array<Record<string, unknown>>>(
    `apogee_developer_profiles?primary_wallet=eq.${encodeURIComponent(session.address)}&select=*`,
  );
  const wallets = await sbRest<Array<Record<string, unknown>>>(
    `apogee_wallet_identities?address=eq.${encodeURIComponent(session.address)}&select=address,chain,wallet_type,verified,verified_at,last_used,created_at`,
  );
  return NextResponse.json(
    {
      ok: true,
      verified: true,
      address: session.address,
      profile: found.data?.[0] || null,
      wallets: wallets.data || [],
    },
    { headers: corsHeaders },
  );
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) {
    const res = limited.response;
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
  const session = sessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Sign the wallet challenge before saving a profile." },
      { status: 401, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  if (!supabaseAdmin()) {
    return NextResponse.json(
      { ok: false, error: "Profile storage is not configured (missing service role)." },
      { status: 503, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const role = String(body.role || "developer");
  if (!ROLES.has(role)) {
    return NextResponse.json(
      { ok: false, error: "Role must be trader or developer." },
      { status: 400, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  const row = {
    primary_wallet: session.address,
    role,
    display_name: String(body.displayName || body.display_name || "").trim().slice(0, 80) || null,
    username: String(body.username || "").trim().slice(0, 40) || null,
    bio: String(body.bio || "").trim().slice(0, 500) || null,
    last_login: new Date().toISOString(),
  };
  const existing = await sbRest<Array<{ id: string }>>(
    `apogee_developer_profiles?primary_wallet=eq.${encodeURIComponent(session.address)}&select=id`,
  );
  if (existing.data?.[0]?.id) {
    await sbRest(`apogee_developer_profiles?id=eq.${existing.data[0].id}`, {
      method: "PATCH",
      body: JSON.stringify(row),
    });
  } else {
    await sbInsert("apogee_developer_profiles", row);
  }
  return NextResponse.json({ ok: true, address: session.address }, { headers: { ...corsHeaders, ...limited.headers } });
}
