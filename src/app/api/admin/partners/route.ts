import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { sbRest, supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function adminOk(req: NextRequest): boolean {
  const secret = process.env.APOGEE_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-apogee-admin") || "";
  const bearer = req.headers.get("authorization") || "";
  const token = header || (bearer.startsWith("Bearer ") ? bearer.slice(7) : "");
  return token === secret;
}

const STATUSES = new Set(["pending", "accepted", "declined", "active"]);

export async function PATCH(req: NextRequest) {
  if (!process.env.APOGEE_ADMIN_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "Admin is not configured." }, { status: 503, headers: corsHeaders });
  }
  if (!adminOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401, headers: corsHeaders });
  }
  if (!supabaseAdmin()) {
    return NextResponse.json({ ok: false, error: "Service role missing." }, { status: 503, headers: corsHeaders });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  const id = String(body.id || "");
  const status = String(body.status || "");
  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "id and a valid status are required." }, { status: 400, headers: corsHeaders });
  }
  const upd = await sbRest(`apogee_partner_requests?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!upd.ok) {
    return NextResponse.json({ ok: false, error: upd.error || "Update failed." }, { status: 502, headers: corsHeaders });
  }
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}
