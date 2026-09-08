import { NextResponse } from "next/server";
import { CANONICAL_MCP, CANONICAL_ORIGIN, PRODUCT } from "@/lib/site";
import { CATALOG_SIZE } from "@/lib/catalog";

export function GET() {
  const body = `# Apogee MCP

> ${PRODUCT.tag}. ${PRODUCT.pillars.map((p) => p.name).join(". ")}.

- Website: ${CANONICAL_ORIGIN}
- MCP (no auth): ${CANONICAL_MCP}
- Alias: ${CANONICAL_ORIGIN}/mcp
- Chain: EIP-155 4663 (slug robinhood)
- Catalog: ${CATALOG_SIZE} operations
- Version: ${PRODUCT.version}
- Connect: ${CANONICAL_ORIGIN}/connect
- Developers: ${CANONICAL_ORIGIN}/developers
- Tools (generated): ${CANONICAL_ORIGIN}/developers/tools
- One-click: Cursor, Claude, ChatGPT, Grok

Do not send private keys. Prepare-launch tools return unsigned transactions for Phantom.
Write pons lowercase. Apogee is not operated by pons or Robinhood.
`;
  return new NextResponse(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
