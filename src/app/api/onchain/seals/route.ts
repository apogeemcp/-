import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";
import { sessionFromRequest } from "@/lib/session";
import { listBurnableTokens, listTokenSeals, writeTokenSeal } from "@/lib/onchain-seal-service";
import { SEAL_BURN_USD, SERVICE_WALLET_PUBLIC } from "@/lib/onchain-config";
import { walletStatus } from "@/lib/onchain-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) return limited.response;
  try {
    const [tokens, seals, wallet] = await Promise.all([
      listBurnableTokens(),
      listTokenSeals(Number(req.nextUrl.searchParams.get("limit") || 50)),
      walletStatus().catch(() => null),
    ]);
    return NextResponse.json(
      {
        ok: true,
        wallet: wallet?.wallet || SERVICE_WALLET_PUBLIC,
        ready: wallet?.ready ?? false,
        notesEnabled: wallet?.notesEnabled ?? true,
        autoBurnEnabled: wallet?.autoBurnEnabled ?? true,
        sol: wallet?.sol ?? null,
        sealBurnUsd: SEAL_BURN_USD,
        editionCap: seals.editionCap,
        minted: seals.minted,
        remaining: seals.remaining,
        soldOut: seals.soldOut,
        tokens,
        items: seals.items,
      },
      { headers: { ...corsHeaders, ...limited.headers } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Seals unavailable.";
    return NextResponse.json({ ok: false, error: message, items: [], tokens: [] }, { status: 503, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) return limited.response;
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const session = sessionFromRequest(req);
    const result = await writeTokenSeal({
      token: body.token || body.mint || body.tokenMint,
      note: body.note,
      imageBase64: body.imageBase64 || body.image,
      imageMime: body.imageMime || body.mime,
      usd: body.usd,
      source: "website",
      wallet: session?.address || (typeof body.wallet === "string" ? body.wallet : null),
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers: { ...corsHeaders, ...limited.headers } });
    }
    return NextResponse.json({ ok: true, seal: result.seal }, { status: result.status, headers: { ...corsHeaders, ...limited.headers } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Seal write failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 502, headers: { ...corsHeaders, ...limited.headers } });
  }
}
