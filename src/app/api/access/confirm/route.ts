import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { rejectUnverifiedConfirm } from "@/lib/checkout";

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
  await req.json().catch(() => ({}));
  const result = rejectUnverifiedConfirm();
  return NextResponse.json(result, { status: 503, headers: { ...corsHeaders, ...limited.headers } });
}
