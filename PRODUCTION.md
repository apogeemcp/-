# Production checklist

Internal gate for Apogee (`apogeemcp.digital`). Do not claim a box is done unless it was verified on this revision.

## Identity (do not invent)

- Product name is **Apogee**. In-app AI is **Orbit**. Launchpad is **pons** (unaffiliated).
- Chain is EIP-155 **4663**, DexScreener/Gecko slug **`robinhood`**.
- MCP is Streamable HTTP `POST /api/mcp` (alias `/mcp`), protocol `2025-03-26`, **`auth: none`**.
- There are **no user accounts**, OAuth, API keys, paid MCP tiers, or cost-basis PnL.
- `$ORBITX` MCP-access buy-and-burn after treasury payment stays **manual** until an admin records a burn signature.
- On-chain notes (`/onchain-notes`) are a separate service-wallet flow: real Solana memos + optional ~$0.02 $ORBITX buy/burn. Requires `ORBITX_SERVICE_PRIVATE_KEY` on Vercel. Never put that key in git, Supabase, or the client.
- GitHub is `https://github.com/apogeemcp/-`. Project CA is copy-only — no invented explorer.

## Gate

- [ ] `npm test` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] On-chain notes: `20260909010000_onchain_notes.sql` applied; activity SELECT for anon; service role writes
- [ ] `ORBITX_SERVICE_PRIVATE_KEY` set on Vercel only; public wallet funded with SOL before enabling auto-burn
- [ ] Usage writes only with `SUPABASE_SERVICE_ROLE_KEY` (no anon-key fallback)
- [ ] MCP `tools/list` matches `src/lib/tools.ts`; catalog aliases via `search_catalog` / `run_tool` (nesting capped)
- [ ] Rate limit headers present on MCP POST, REST tools, `/api/agent`, `/api/usage`
- [ ] `prepare_pons_launch` unsigned txs are allowlisted (`assertLaunchTx`) before Phantom `eth_sendTransaction`
- [ ] Orbit cannot sign an arbitrary `to` / selector / oversized fee
- [ ] Token pages, Desk, Launch, Orbit, wallet track, analytics load with empty/error states
- [ ] PnL copy says mark-to-market, not exact cost basis
- [ ] PWA: `sw.js` cache name bumped; navigate is network-first
- [ ] robots disallow `/api/`; sitemap uses `publicSiteUrl()`
- [ ] Legal pages match the live product (auth none, unsigned launches, Stock Token regions)
- [ ] External links HTTPS; pons app is `https://www.ponsfamily.com/launchpad`
- [ ] No private keys, seeds, or service-role secrets in the client bundle
- [ ] Mobile header/tabs and desktop 1440 layout — no horizontal overflow on primary routes
- [ ] No critical console errors on Home, Desk, Orbit, Developers

## Recovery (actual)

- Schema changes ship as ordered SQL under `supabase/migrations/`.
- Hosted Supabase PITR / backups exist only if enabled on the project in the Supabase dashboard — this repo does **not** run its own backup job.
- Rollback: revert the git deploy on Vercel; do not drop tables without a migration.
