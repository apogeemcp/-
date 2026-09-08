import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { parsePartnerPayload } from "@/lib/partners";
import { supabaseUrl } from "@/lib/site";

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
  const parsed = parsePartnerPayload(await req.json().catch(() => ({})));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400, headers: { ...corsHeaders, ...limited.headers } });
  }
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Partnership inbox is not configured (missing service role). Use Telegram or GitHub instead." },
      { status: 503, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  const ip = clientIp(req);
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const row = {
    company: parsed.value.company,
    website: parsed.value.website || null,
    contact: parsed.value.contact,
    use_case: parsed.value.useCase,
    expected_usage: parsed.value.expectedUsage || null,
    integration_type: parsed.value.integrationType || null,
    requested_tools: parsed.value.requestedTools || null,
    extra: parsed.value.extra || null,
    ip_hash: ipHash,
    status: "pending",
  };
  const res = await fetch(`${url}/rest/v1/apogee_partner_requests`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Could not store the request. Try again later or use GitHub." },
      { status: 502, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  return NextResponse.json({ ok: true }, { headers: { ...corsHeaders, ...limited.headers } });
}
