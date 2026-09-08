import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { dispatchTool } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ tool: string }> }) {
  const { tool } = await ctx.params;
  return run(tool, Object.fromEntries(_req.nextUrl.searchParams.entries()));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ tool: string }> }) {
  const { tool } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return run(tool, body);
}

async function run(tool: string, args: Record<string, unknown>) {
  try {
    const result = await dispatchTool(tool, args);
    return NextResponse.json({ ok: true, tool, result }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 404, headers: corsHeaders },
    );
  }
}
