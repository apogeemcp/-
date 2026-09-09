import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { walletStatus } from "@/lib/onchain-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) return limited.response;
  const data = await walletStatus();
  return NextResponse.json(data, { headers: { ...corsHeaders, ...limited.headers } });
}
