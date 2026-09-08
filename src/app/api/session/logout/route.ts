import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { clearSessionCookieHeader } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: corsHeaders });
  res.headers.append("Set-Cookie", clearSessionCookieHeader());
  return res;
}
