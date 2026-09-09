import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { adminAuthorized, adminSecretConfigured } from "@/lib/admin-auth";
import { recoverPending } from "@/lib/onchain-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const cron = process.env.CRON_SECRET?.trim();
  const given = req.headers.get("x-cron-secret") || "";
  const bearer = req.headers.get("authorization") || "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (cron && (given === cron || token === cron)) return true;
  return adminSecretConfigured() && adminAuthorized(req);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401, headers: corsHeaders });
  const rows = await recoverPending(8);
  return NextResponse.json({ ok: true, recovered: rows.filter(Boolean).length }, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401, headers: corsHeaders });
  const rows = await recoverPending(8);
  return NextResponse.json({ ok: true, recovered: rows.filter(Boolean).length }, { headers: corsHeaders });
}
