import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { sessionFromRequest } from "@/lib/session";
import { notesIndex, writeOnchainNote } from "@/lib/onchain-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) return limited.response;
  const url = req.nextUrl;
  const session = sessionFromRequest(req);
  const mine = url.searchParams.get("mine") === "1";
  const data = await notesIndex({
    wallet: mine ? session?.address : url.searchParams.get("wallet") || undefined,
    search: url.searchParams.get("search") || undefined,
    limit: Number(url.searchParams.get("limit") || 20),
    offset: Number(url.searchParams.get("offset") || 0),
  });
  return NextResponse.json(data, { headers: { ...corsHeaders, ...limited.headers } });
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) return limited.response;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const session = sessionFromRequest(req);
  const result = await writeOnchainNote({
    note: body.note,
    idempotencyKey: body.idempotencyKey || body.id,
    source: "website",
    wallet: session?.address || (typeof body.wallet === "string" ? body.wallet : null),
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
  return NextResponse.json(
    { ok: true, idempotent: result.idempotent, note: result.note },
    { status: result.status, headers: { ...corsHeaders, ...limited.headers } },
  );
}
