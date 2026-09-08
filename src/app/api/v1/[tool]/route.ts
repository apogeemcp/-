import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { dispatchTool, httpStatusForToolError } from "@/lib/dispatch";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ tool: string }> }) {
  const { tool } = await ctx.params;
  return run(_req, tool, Object.fromEntries(_req.nextUrl.searchParams.entries()));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ tool: string }> }) {
  const { tool } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return run(req, tool, body);
}

async function run(req: NextRequest, tool: string, args: Record<string, unknown>) {
  const limited = checkRateLimit(req);
  if (!limited.ok) {
    const res = limited.response;
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
  try {
    const result = await dispatchTool(tool, args);
    return NextResponse.json({ ok: true, tool, result }, { headers: { ...corsHeaders, ...limited.headers } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: httpStatusForToolError(message), headers: { ...corsHeaders, ...limited.headers } },
    );
  }
}
