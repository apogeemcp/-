import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { runAgent } from "@/lib/agent";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (!limited.ok) {
    const res = limited.response;
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
  const body = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    message?: string;
    history?: Array<{ role: "user" | "assistant" | "tool"; content: string }>;
  };
  const prompt = String(body.prompt || body.message || "").trim();
  if (!prompt) {
    return NextResponse.json({ ok: false, error: "Empty prompt" }, { status: 400, headers: { ...corsHeaders, ...limited.headers } });
  }
  try {
    const result = await runAgent(prompt, body.history || []);
    return NextResponse.json(result, { headers: { ...corsHeaders, ...limited.headers } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
}
