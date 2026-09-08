import { NextResponse } from "next/server";
import { CANONICAL_MCP, CANONICAL_ORIGIN } from "@/lib/site";
import { CATALOG_SIZE } from "@/lib/catalog";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    name: "apogee",
    title: "Apogee MCP",
    description: "Robinhood Chain intel for agents. Search, chart, desk, launch, wallet tracking.",
    website: CANONICAL_ORIGIN,
    url: CANONICAL_MCP,
    transport: "streamable-http",
    auth: "none",
    chainId: 4663,
    tools: { listed: TOOLS.length, catalog: CATALOG_SIZE },
  });
}
