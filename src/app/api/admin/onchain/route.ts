import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { adminAuthorized, adminSecretConfigured } from "@/lib/admin-auth";
import { adminBurnOrbitx, publicFeed, recoverPending, walletStatus } from "@/lib/onchain-service";
import { patchSettings } from "@/lib/onchain-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function deny(req: NextRequest) {
  if (!adminSecretConfigured()) {
    return NextResponse.json({ ok: false, error: "Admin is not configured." }, { status: 503, headers: corsHeaders });
  }
  if (!adminAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401, headers: corsHeaders });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = deny(req);
  if (blocked) return blocked;
  const [status, feed] = await Promise.all([walletStatus(), publicFeed({ type: "ALL", limit: 40 })]);
  return NextResponse.json({ ok: true, status, activity: feed.items }, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const blocked = deny(req);
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "");
  if (action === "pause_notes") await patchSettings({ notes_enabled: false, paused_reason: "Paused from admin." });
  else if (action === "resume_notes") await patchSettings({ notes_enabled: true, paused_reason: null });
  else if (action === "pause_burns") await patchSettings({ auto_burn_enabled: false });
  else if (action === "resume_burns") await patchSettings({ auto_burn_enabled: true });
  else if (action === "limits") {
    await patchSettings({
      max_daily_burn_usd: Number(body.maxDailyBurnUsd || 50),
      max_daily_sol_spend: Number(body.maxDailySolSpend || 1),
    });
  } else if (action === "recover") {
    const recovered = await recoverPending(8);
    return NextResponse.json({ ok: true, recovered: recovered.length }, { headers: corsHeaders });
  } else if (action === "burn_orbitx") {
    const result = await adminBurnOrbitx(body.amount != null ? Number(body.amount) : undefined);
    if (!result.ok) return NextResponse.json(result, { status: 400, headers: corsHeaders });
    return NextResponse.json(result, { headers: corsHeaders });
  } else {
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400, headers: corsHeaders });
  }
  const status = await walletStatus();
  return NextResponse.json({ ok: true, status }, { headers: corsHeaders });
}
