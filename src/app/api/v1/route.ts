import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { dispatchTool } from "@/lib/dispatch";
import { TOOLS } from "@/lib/tools";
import { CATALOG_SIZE } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    { ok: true, listed: TOOLS.map((t) => t.name), catalog: CATALOG_SIZE, auth: "none" },
    { headers: corsHeaders },
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { tool?: string; arguments?: Record<string, unknown> };
  try {
    const result = await dispatchTool(String(body.tool || ""), body.arguments || {});
    return NextResponse.json({ ok: true, tool: body.tool, result }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 404, headers: corsHeaders },
    );
  }
}
