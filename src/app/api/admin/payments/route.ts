import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { adminActivatePurchase, adminRecordBurn } from "@/lib/checkout";

export const dynamic = "force-dynamic";

function adminOk(req: NextRequest): boolean {
  const secret = process.env.APOGEE_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-apogee-admin") || "";
  const bearer = req.headers.get("authorization") || "";
  const token = header || (bearer.startsWith("Bearer ") ? bearer.slice(7) : "");
  return token === secret;
}

export async function POST(req: NextRequest) {
  if (!process.env.APOGEE_ADMIN_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "Admin is not configured." }, { status: 503, headers: corsHeaders });
  }
  if (!adminOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401, headers: corsHeaders });
  }
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    purchaseId?: string;
    action?: string;
    solscan?: string;
  };
  try {
    if (body.action === "activate" && body.id) {
      const result = await adminActivatePurchase(body.id);
      return NextResponse.json(result, { headers: corsHeaders });
    }
    if (body.action === "record_burn" && (body.purchaseId || body.id) && body.solscan) {
      const result = await adminRecordBurn({ purchaseId: String(body.purchaseId || body.id), solscan: body.solscan });
      return NextResponse.json(result, { headers: corsHeaders });
    }
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400, headers: corsHeaders });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status, headers: corsHeaders },
    );
  }
}
