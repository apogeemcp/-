import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { sessionFromRequest } from "@/lib/session";
import { sbRest, supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: true, items: [], note: "Sign in with a verified wallet to load notifications." }, { headers: corsHeaders });
  }
  if (!supabaseAdmin()) {
    return NextResponse.json({ ok: true, items: [], note: "Notification store is not configured." }, { headers: corsHeaders });
  }
  const found = await sbRest<Array<Record<string, unknown>>>(
    `apogee_notifications?wallet=eq.${encodeURIComponent(session.address)}&select=id,kind,title,body,read,created_at&order=created_at.desc&limit=40`,
  );
  return NextResponse.json({ ok: true, items: found.data || [] }, { headers: corsHeaders });
}
