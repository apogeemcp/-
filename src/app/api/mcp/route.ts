import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, handleMcpBody } from "@/lib/mcp";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    {
      name: "apogee",
      transport: "streamable-http",
      protocol: "2025-03-26",
      url: "https://apogeemcp.digital/api/mcp",
      auth: "none",
      tools: 3000,
    },
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
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const { payload, notification } = await handleMcpBody(body);
  if (notification) {
    return new NextResponse(null, { status: 202, headers: { ...corsHeaders, ...limited.headers } });
  }
  return NextResponse.json(payload, {
    headers: {
      ...corsHeaders,
      ...limited.headers,
      "content-type": "application/json",
      "mcp-protocol-version": "2025-03-26",
    },
  });
}
