import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { findNoteById, notePublic } from "@/lib/onchain-store";
import { getNoteBySignature, resumeNote } from "@/lib/onchain-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const limited = checkRateLimit(req);
  if (!limited.ok) return limited.response;
  const { id } = await ctx.params;
  if (id.length >= 64) {
    const found = await getNoteBySignature(id);
    return NextResponse.json({ ok: true, ...found }, { headers: { ...corsHeaders, ...limited.headers } });
  }
  const note = await findNoteById(id);
  if (!note) return NextResponse.json({ ok: false, error: "Note not found." }, { status: 404, headers: corsHeaders });
  if (req.nextUrl.searchParams.get("resume") === "1") await resumeNote(id);
  const latest = (await findNoteById(id)) || note;
  return NextResponse.json({ ok: true, note: notePublic(latest) }, { headers: { ...corsHeaders, ...limited.headers } });
}
