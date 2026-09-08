import { NextResponse } from "next/server";
import { CANONICAL_MCP, CANONICAL_ORIGIN } from "@/lib/site";
import { CATALOG_SIZE } from "@/lib/catalog";

export function GET() {
  const body = `# Apogee MCP

> Robinhood Chain intel for agents. Search. Chart. Desk. Launch. Track.

- Website: ${CANONICAL_ORIGIN}
- MCP (no auth): ${CANONICAL_MCP}
- Alias: ${CANONICAL_ORIGIN}/mcp
- Chain: EIP-155 4663 (slug robinhood)
- Catalog: ${CATALOG_SIZE} operations
- Connect: ${CANONICAL_ORIGIN}/connect
- One-click: Cursor, Claude, ChatGPT, Grok

Do not send private keys. Prepare-launch tools return unsigned transactions for Phantom.
Write pons lowercase. Apogee is not operated by pons or Robinhood.
`;
  return new NextResponse(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
