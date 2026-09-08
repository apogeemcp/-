import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/mcp";
import { runAgent } from "@/lib/agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    message?: string;
    history?: Array<{ role: "user" | "assistant" | "tool"; content: string }>;
  };
  const prompt = String(body.prompt || body.message || "").trim();
  if (!prompt) {
    return NextResponse.json({ ok: false, error: "Empty prompt" }, { status: 400, headers: corsHeaders });
  }
  try {
    const result = await runAgent(prompt, body.history || []);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
}
