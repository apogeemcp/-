import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { sessionFromRequest, sessionConfigured } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = sessionFromRequest(req);
  return NextResponse.json(
    {
      ok: true,
      configured: sessionConfigured(),
      verified: Boolean(session),
      address: session?.address || null,
      chain: session?.chain || null,
      exp: session?.exp || null,
    },
    { headers: corsHeaders },
  );
}
