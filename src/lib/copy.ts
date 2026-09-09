import { CANONICAL_MCP, PRODUCT } from "./site";

export const GLOSSARY: Record<string, { term: string; text: string }> = {
  mcap: {
    term: "Market cap",
    text: "Price times supply (or FDV when circulating supply is unknown). DexScreener/Gecko figures can differ from on-chain supply.",
  },
  liquidity: {
    term: "Liquidity",
    text: "USD value sitting in the deepest Robinhood Chain pool. Thin liquidity means small trades move price a lot.",
  },
  volume: {
    term: "Volume",
    text: "USD traded in the selected window. Apogee reads DexScreener/GeckoTerminal — not a private order book.",
  },
  holders: {
    term: "Holders",
    text: "A proxy from recent trades or transfers. Blockscout holder ledgers are often Cloudflare-gated, so this is not a complete census.",
  },
  pnl: {
    term: "PnL",
    text: "Mark-to-market only: current USD value of watched balances. Cost basis / realized PnL is not invented when explorer history is missing.",
  },
  ratio: {
    term: "Buy/sell ratio",
    text: "Buys divided by sells in the DexScreener window. A ratio above 1 means more buy prints than sells — not a prediction.",
  },
  fees: {
    term: "Creator fees",
    text: "On-chain pons locker split when the factory returns it. Totals are not fully indexed; we show policy, not guessed dollar fees.",
  },
  burns: {
    term: "Burns",
    text: "Transfers to the zero or dead address. If explorer APIs are gated, the burn list stays empty rather than faked.",
  },
  risk: {
    term: "Risk",
    text: "Ticker collisions, lookalikes, and liquidity flags from scan_token. Graduation on pons is not a quality signal.",
  },
  wallet: {
    term: "Wallet activity",
    text: "RPC balances plus optional explorer flow. Apogee never asks for a seed phrase. You sign pons launches in Phantom.",
  },
  mcp: {
    term: "MCP",
    text: `Model Context Protocol — a standard so Cursor, Claude, ChatGPT, and Grok can call Apogee tools at ${CANONICAL_MCP}. Auth: none.`,
  },
  orbit: {
    term: "Orbit",
    text: "Apogee's in-app assistant. It calls the same MCP tools. NVIDIA NIM is used only if NVIDIA_API_KEY is set on the server.",
  },
};

export const GUIDES = {
  desk: {
    title: "How Desk works",
    body: "Scan a ticker or contract, then read live chain height, TVL, 1h gainers/losers, Stock Token premiums, and pons launches. Trending names link to the token's 0x address — not the Uniswap v4 pool id.",
  },
  launch: {
    title: "How Launch works",
    body: "Apogee indexes pons v1/v2 TokenLaunched logs on Robinhood Chain. Cards open the token terminal. Graduation means the curve filled; it is not quality. prepare_pons_launch returns an unsigned tx you sign in Phantom.",
  },
  orbit: {
    title: "How Orbit works",
    body: "Ask in plain language. Orbit calls live MCP tools (scan, desk, wallet, launches). It will not invent prices. If NVIDIA_API_KEY is configured, NVIDIA NIM chooses tools; otherwise the MCP agent still returns real data.",
  },
  mcp: {
    title: "How MCP tools work",
    body: `Add ${CANONICAL_MCP} to Cursor, Claude, ChatGPT, or Grok with authentication set to none. tools/list is the primary set; search_catalog + run_tool reach all ${PRODUCT.toolCount} catalog operations.`,
  },
  profile: {
    title: "Understanding your portfolio",
    body: "Connect Phantom or paste a 0x address. Equity is mark-to-market from DexScreener. We do not fabricate cost-basis PnL. Keys never leave your wallet.",
  },
  token: {
    title: "Understanding this token",
    body: "Header is on-chain + DexScreener + Gecko metadata. Chart is GeckoTerminal OHLCV. Buys/sells are pool trades. Holders and burns are proxies. Copy CA is the full contract.",
  },
  onchain: {
    title: "How on-chain notes work",
    body: "You write text. The service wallet records it as a Solana memo (ORBITX_NOTE:v1:…). After confirmation it buys about $0.02 of $ORBITX and burns it. Solana is the source of truth; Postgres stores a copy so the feed, memo, and price do not wait on RPC. On Solscan, Overview often hides memos: open Instructions, Program logs, or Raw.",
  },
} as const;

export const FAQ = [
  {
    id: "apogee",
    title: "Apogee",
    items: [
      {
        q: "What is Apogee?",
        a: "A Robinhood Chain intelligence surface for humans and agents: search, charts, desk, pons launches, wallet tracking, and MCP tools — not a custodian and not a CEX.",
      },
      {
        q: "What does Apogee do?",
        a: "It reads public RPC, DexScreener, GeckoTerminal, DefiLlama, RHJ Stock Token APIs, and on-chain pons factories, then exposes that as a website and as MCP/REST tools.",
      },
      {
        q: "Who is Apogee for?",
        a: "Traders, researchers, and agent hosts (Cursor, Claude, ChatGPT, Grok) who need Robinhood Chain context without pasting keys.",
      },
      {
        q: "What chains are supported?",
        a: "Robinhood Chain only (EIP-155 4663). DexScreener/Gecko slug is robinhood, never 4663.",
      },
    ],
  },
  {
    id: "ai",
    title: "Orbit AI",
    items: [
      {
        q: "What is Orbit?",
        a: "The in-app assistant on /orbit. Same tools as the MCP server. It scans tokens, tracks wallets, and can prepare an unsigned pons launch.",
      },
      {
        q: "Which model powers Orbit?",
        a: "If NVIDIA_API_KEY is set, NVIDIA NIM (default meta/llama-3.1-70b-instruct) with tool calling. Otherwise a deterministic MCP-tools agent. There is no NVIDIA model inside Supabase.",
      },
      {
        q: "Can Orbit use Apogee tools?",
        a: "Yes. It dispatches the same listed MCP tools. Replies show which tools ran. Tool failures are explained; the chat does not crash.",
      },
      {
        q: "What can I ask?",
        a: "Scan NVDA, desk overview, track a 0x wallet, holders, activity, or “launch token named Aurora ticker AUR”. Do not paste a seed phrase.",
      },
    ],
  },
  {
    id: "mcp",
    title: "MCP",
    items: [
      {
        q: "What is MCP?",
        a: "Model Context Protocol. Hosts call Apogee over HTTP. Canonical URL: " + CANONICAL_MCP + " (alias /mcp). Auth none.",
      },
      {
        q: "What tools are available?",
        a: `${PRODUCT.toolCount} catalog operations. Listed tools with schemas: /developers/tools (generated from source). Aliases like scan_NVDA go through search_catalog / run_tool.`,
      },
      {
        q: "How does MCP interact with the site?",
        a: "The website, /api/v1, and /api/mcp share src/lib/dispatch.ts. A scan on Desk is the same engine an agent calls.",
      },
      {
        q: "Do I need $ORBITX to use MCP?",
        a: "No. Live MCP is auth none. Optional paid plans: send SOL or USDC to the published Solana treasury, then paste the Solscan tx link. 25% is allocated to a manual $ORBITX buy-and-burn after payment. Do not pay any other address.",
      },
      {
        q: "What are on-chain notes?",
        a: "write_onchain_note records a public Solana memo from the Apogee service wallet, then queues about $0.02 of $ORBITX buy-and-burn. The feed on /onchain-notes shows confirmed signatures only. Do not put secrets in a memo.",
      },
      {
        q: "Can I embed Apogee in my own product?",
        a: "Yes. Connect https://apogeemcp.digital/api/mcp or REST /api/v1. Partnership conversations: /developers/partners. That form does not sell access.",
      },
      {
        q: "How does Orbit use MCP?",
        a: "Orbit POSTs /api/agent, which runs dispatchTool. NVIDIA, when enabled, chooses tools; otherwise intents map to the same functions.",
      },
    ],
  },
  {
    id: "data",
    title: "Trading / data",
    items: [
      {
        q: "Where does token data come from?",
        a: "Public RPC, DexScreener, GeckoTerminal, DefiLlama, RHJ, and pons factory logs. It can be delayed or wrong. Tickers collide — resolve by contract.",
      },
      {
        q: "How often is data updated?",
        a: "On request. Desk refreshes about every 45s in the browser. Token buy/sell polls Gecko trades every 20s. There is no private websocket firehose.",
      },
      {
        q: "How is PnL calculated?",
        a: "Mark-to-market: RPC balances × DexScreener USD. Cost basis is not recovered when Blockscout history is truncated. We do not invent realized PnL.",
      },
      {
        q: "What does liquidity mean?",
        a: "USD in the deepest Robinhood Chain pool for that token. See the glossary chip on token pages.",
      },
    ],
  },
  {
    id: "launch",
    title: "Launch",
    items: [
      {
        q: "How do launches work?",
        a: "pons v2 is a bonding curve then Uniswap v4. v1 is Uniswap v3 vs WETH. Apogee indexes TokenLaunched events. You sign the unsigned v2 tx in Phantom.",
      },
      {
        q: "Where does token metadata come from?",
        a: "On-chain pons metadata, DexScreener info, Gecko token/info (image, socials, supply), IPFS/Arweave URI fallbacks.",
      },
      {
        q: "Why might an image be missing?",
        a: "Broken URI, slow IPFS, or no metadata. Cards show a letter mark instead of hiding the token.",
      },
    ],
  },
  {
    id: "wallet",
    title: "Wallet",
    items: [
      {
        q: "Is Apogee custodial?",
        a: "No. Phantom (EIP-1193) stays in your browser. We never take a seed phrase or private key.",
      },
      {
        q: "What wallet information is displayed?",
        a: "Address, native ETH mark, watched USDG/WETH/Stock Token balances, and explorer flow when Blockscout allows it.",
      },
      {
        q: "How is wallet data handled?",
        a: "Queries run in your session against public RPC/APIs. There are no user accounts to store a portfolio.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    items: [
      {
        q: "What information is public?",
        a: "Anything you look up is already on a public chain or market API. The site does not publish a social profile of your trades.",
      },
      {
        q: "What information is private?",
        a: "There is no account, so no visibility toggle. Tool telemetry may log tool name, query string, and timestamp when Supabase is configured.",
      },
      {
        q: "How do privacy settings work?",
        a: "They don't exist as account switches. See /privacy. Do not expect a public/private profile that isn't in the backend.",
      },
    ],
  },
] as const;

export const ABOUT = [
  {
    title: "What is Apogee?",
    body: "Apogee is a trading-intelligence and agent platform for Robinhood Chain. It brings market data, token analytics, pons launches, wallet marks, and MCP tools into one surface so humans and models share the same facts.",
  },
  {
    title: "Why Apogee?",
    body: "Tickers collide, explorer APIs flake, and launch UIs hide the factory. Apogee resolves by contract, labels proxies honestly, and keeps pons lowercase — unaffiliated with Robinhood and pons.",
  },
  {
    title: "Orbit",
    body: "Orbit is the in-app AI. It calls live MCP tools rather than inventing prices. NVIDIA NIM is optional server config; without it, the MCP agent still returns real desk, scan, and wallet data.",
  },
  {
    title: "MCP",
    body: `Hosts add ${CANONICAL_MCP} with auth none. The catalog is ${PRODUCT.toolCount} Robinhood Chain operations. The website is the same dispatch layer agents use.`,
  },
  {
    title: "Market intelligence",
    body: "Desk, scan, and token terminals read DexScreener, GeckoTerminal, RHJ oracles, and chain stats. Gainers, volume, and premiums are live prints, not placeholders.",
  },
  {
    title: "Launch",
    body: "On-chain pons v1/v2 indexing. Cards open a terminal. Phantom signs unsigned v2 launches. Graduation is not quality.",
  },
  {
    title: "Wallet intelligence",
    body: "Profile is wallet + portfolio: connect or paste 0x, mark-to-market equity, positions linked to token pages. No custodial balances.",
  },
  {
    title: "Analytics",
    body: "Volume, buy/sell, holder proxies, Gecko trades, burns when explorer allows, repeat-buy wallets. Labeled as samples where the ledger is incomplete.",
  },
  {
    title: "Future",
    body: "The catalog and UI keep moving with the chain. We add sources when they are real; we do not ship fake feeds to look busy.",
  },
] as const;
