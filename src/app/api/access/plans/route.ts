import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { publicCatalogPayload } from "@/lib/access";

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
  return NextResponse.json(publicCatalogPayload(), {
    headers: {
      ...corsHeaders,
      ...limited.headers,
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    },
  });
}
