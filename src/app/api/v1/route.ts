import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { toolImpl, type ToolName } from "@/lib/intel";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    { ok: true, tools: TOOLS.map((t) => t.name), auth: "none" },
    { headers: corsHeaders },
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { tool?: string; arguments?: Record<string, unknown> };
  const name = body.tool as ToolName;
  const impl = toolImpl[name];
  if (!impl) {
    return NextResponse.json({ ok: false, error: `Unknown tool ${body.tool}` }, { status: 404, headers: corsHeaders });
  }
  try {
    const result = await impl(body.arguments || {});
    return NextResponse.json({ ok: true, tool: name, result }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
}
