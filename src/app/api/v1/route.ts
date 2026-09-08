import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { dispatchTool, httpStatusForToolError } from "@/lib/dispatch";
import { TOOLS } from "@/lib/tools";
import { CATALOG_SIZE } from "@/lib/catalog";
import { checkRateLimit } from "@/lib/ratelimit";

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
  const limited = checkRateLimit(req);
  if (!limited.ok) {
    const res = limited.response;
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
  const body = (await req.json().catch(() => ({}))) as { tool?: string; arguments?: Record<string, unknown> };
  try {
    const result = await dispatchTool(String(body.tool || ""), body.arguments || {});
    return NextResponse.json({ ok: true, tool: body.tool, result }, { headers: { ...corsHeaders, ...limited.headers } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: httpStatusForToolError(message), headers: { ...corsHeaders, ...limited.headers } },
    );
  }
}
