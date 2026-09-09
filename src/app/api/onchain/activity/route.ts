import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { publicFeed } from "@/lib/onchain-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) return limited.response;
  const data = await publicFeed({
    type: req.nextUrl.searchParams.get("type") || "ALL",
    limit: Number(req.nextUrl.searchParams.get("limit") || 24),
    offset: Number(req.nextUrl.searchParams.get("offset") || 0),
  });
  return NextResponse.json(data, { headers: { ...corsHeaders, ...limited.headers } });
}
