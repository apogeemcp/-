import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { sessionFromRequest } from "@/lib/session";
import { sbInsert, supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const TOPICS = new Set(["docs", "mcp", "access", "security", "partnership", "other"]);

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
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (String(body.websiteTrap || "").trim()) {
    return NextResponse.json({ ok: false, error: "Rejected." }, { status: 400, headers: { ...corsHeaders, ...limited.headers } });
  }
  const topic = String(body.topic || "other").trim();
  const contact = String(body.contact || "").trim();
  const text = String(body.body || body.message || "").trim();
  if (!TOPICS.has(topic)) {
    return NextResponse.json({ ok: false, error: "Unknown topic." }, { status: 400, headers: { ...corsHeaders, ...limited.headers } });
  }
  if (contact.length < 3 || contact.length > 200) {
    return NextResponse.json({ ok: false, error: "Contact must be 3–200 characters." }, { status: 400, headers: { ...corsHeaders, ...limited.headers } });
  }
  if (text.length < 10 || text.length > 4000) {
    return NextResponse.json({ ok: false, error: "Message must be 10–4000 characters." }, { status: 400, headers: { ...corsHeaders, ...limited.headers } });
  }
  if (!supabaseAdmin()) {
    return NextResponse.json(
      { ok: false, error: "Support inbox is not configured (missing service role). Use GitHub or Telegram instead." },
      { status: 503, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  const session = sessionFromRequest(req);
  const ipHash = createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 32);
  const inserted = await sbInsert("apogee_support_requests", {
    topic,
    contact,
    body: text,
    wallet: session?.address || null,
    ip_hash: ipHash,
    status: "open",
  });
  if (!inserted.ok) {
    return NextResponse.json(
      { ok: false, error: "Could not store the request. Try GitHub issues." },
      { status: 502, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  return NextResponse.json({ ok: true }, { headers: { ...corsHeaders, ...limited.headers } });
}
