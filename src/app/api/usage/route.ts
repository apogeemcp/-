import { NextRequest, NextResponse } from "next/server";
import { usageSummary } from "@/lib/usage";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) {
    const res = limited.response;
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
  const data = await usageSummary();
  return NextResponse.json(data, { headers: { ...corsHeaders, ...limited.headers } });
}
