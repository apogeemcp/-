import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { getChainStats } from "@/lib/intel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getChainStats();
    return NextResponse.json({ ok: true, ...stats }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
}
