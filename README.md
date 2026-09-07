# Apogee MCP

Robinhood Chain intel for agents. **Search. Chart. Desk. Launch.**

Apogee is the Robinhood Chain counterpart to an OrbitX / OG Scan MCP: the same agent surface — token search, composite scans, candles, a trading desk, and launch feed — rebuilt for chain ID **4663**.

No login. Add the MCP URL to Cursor, Claude, ChatGPT, Windsurf, Gemini, Codex, or VS Code and use it.

## MCP

Website (after deploy):

```
https://<your-host>/api/mcp
```

Hosted Supabase (no auth):

```
https://paxtohwiycuhwmlziwrr.supabase.co/functions/v1/apogee-mcp
```

Cursor example:

```json
{
  "mcpServers": {
    "apogee": {
      "url": "https://<your-host>/api/mcp"
    }
  }
}
```

REST mirror: `GET /api/v1/<tool>` or `POST /api/v1` with `{ "tool": "scan_token", "arguments": { "query": "NVDA" } }`.

## Tools

`search_token` `scan_token` `get_token` `get_chart` `get_desk` `list_trending` `list_launches` `list_top_pools` `list_stock_tokens` `get_stock_quote` `get_holders` `get_wallet` `get_chain_stats` `get_transaction` `get_safety` `verify_token` `get_swap_quote` `get_pair` `get_corporate_actions` `apogee_status`

Ticker collisions are real on this chain. Always resolve by contract. Canonical Stock Tokens come from [RHJ `/assets`](https://api.robinhood.com/rhj/assets).

## Develop

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:3000/dashboard`.

## Stack

- Next.js 15 app (3D Saturn desk, legal pages, MCP HTTP)
- Supabase Edge Functions (`apogee-mcp`, `apogee-api`) on the Degen project
- Public RH RPC, DexScreener, GeckoTerminal, DefiLlama, RHJ

Not affiliated with Robinhood Markets, Inc. Stock Tokens may be restricted for US/Canada/UK/Switzerland persons. Read-only. No keys. No signing.
