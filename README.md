# Apogee MCP

Robinhood Chain intel for agents. **Search. Chart. Desk. Launch. Track.**

3000 catalog operations for chain ID **4663**. Wallet tracking, analytics, Stock Tokens, and pons launches signed in **Phantom** (Ethereum mode).

## MCP

Canonical live URL (no auth):

```
https://apogeemcp.digital/api/mcp
```

Alias: `https://apogeemcp.digital/mcp`

One-click: [apogeemcp.digital/connect](https://apogeemcp.digital/connect) — Add to Cursor, Claude, ChatGPT, or Grok.

```json
{
  "mcpServers": {
    "apogee": {
      "url": "https://apogeemcp.digital/api/mcp"
    }
  }
}
```

REST: `GET /api/v1/<tool>` including aliases like `scan_NVDA` or `volume_1h`.

## Product

- `/connect` — one-click MCP install
- `/orbit` — chat + prepare pons launch + Phantom sign
- `/wallet` — track any 0x or the connected Phantom
- `/analytics` — volume, flow, smart-money proxy
- `/launches` — on-chain pons index

Never paste a seed. `prepare_pons_launch` returns an unsigned tx.

Write **pons** lowercase. Apogee is not operated by pons or Robinhood.

## Develop

```bash
npm install
npm test
npm run dev
```

## Vercel

Next.js 15. `vercel.json` pins `framework: "nextjs"`.

Not affiliated with Robinhood Markets, Inc. Stock Tokens may be restricted for US/Canada/UK/Switzerland persons.
