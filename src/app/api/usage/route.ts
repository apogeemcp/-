import { NextResponse } from "next/server";
import { usageSummary } from "@/lib/usage";
import { corsHeaders } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await usageSummary();
  return NextResponse.json(data, { headers: corsHeaders });
}
