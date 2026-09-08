import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { getChainStats } from "@/lib/intel";

export const dynamic = "force-dynamic";

let cached: { at: number; body: unknown } | null = null;

export async function GET() {
  try {
    if (cached && Date.now() - cached.at < 15_000) {
      return NextResponse.json(cached.body, { headers: corsHeaders });
    }
    const stats = await getChainStats();
    const body = { ok: true, ...stats };
    cached = { at: Date.now(), body };
    return NextResponse.json(body, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
}
