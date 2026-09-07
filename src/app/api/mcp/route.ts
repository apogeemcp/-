import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, handleMcpBody } from "@/lib/mcp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    {
      name: "apogee",
      transport: "streamable-http",
      protocol: "2025-03-26",
      auth: "none",
      tools: true,
    },
    { headers: corsHeaders },
  );
}

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const { payload, notification } = await handleMcpBody(body);
  if (notification) return new NextResponse(null, { status: 202, headers: corsHeaders });
  return NextResponse.json(payload, {
    headers: { ...corsHeaders, "content-type": "application/json", "mcp-protocol-version": "2025-03-26" },
  });
}
