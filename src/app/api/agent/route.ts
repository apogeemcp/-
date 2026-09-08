import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { runAgent } from "@/lib/agent";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

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
  const prompt = String(body.prompt || body.message || "").trim().slice(0, 4_000);
  if (!prompt) {
    return NextResponse.json({ ok: false, error: "Empty prompt" }, { status: 400, headers: { ...corsHeaders, ...limited.headers } });
  }
  const history = (body.history || []).slice(-8).map((m) => ({
    role: m.role,
    content: String(m.content || "").slice(0, 4_000),
  }));
  try {
    const result = await Promise.race([
      runAgent(prompt, history),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Agent timed out")), 40_000);
      }),
    ]);
    return NextResponse.json(result, { headers: { ...corsHeaders, ...limited.headers } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: /timed out/i.test(message) ? 504 : 500, headers: { ...corsHeaders, ...limited.headers } },
    );
  }
}
