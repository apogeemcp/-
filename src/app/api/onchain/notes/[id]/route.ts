import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { getNoteBySignature, resumeNote } from "@/lib/onchain-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const limited = checkRateLimit(req);
  if (!limited.ok) return limited.response;
  const { id } = await ctx.params;
  if (req.nextUrl.searchParams.get("resume") === "1") {
    const resumed = await resumeNote(id);
    if (resumed) {
      return NextResponse.json({ ok: true, note: resumed, source: "solana" }, { headers: { ...corsHeaders, ...limited.headers } });
    }
  }
  const found = await getNoteBySignature(id);
  if (!found.note && !found.chain?.ok) {
    return NextResponse.json({ ok: false, error: "Note not found on Solana." }, { status: 404, headers: corsHeaders });
  }
  return NextResponse.json({ ok: true, ...found, source: "solana" }, { headers: { ...corsHeaders, ...limited.headers } });
}
