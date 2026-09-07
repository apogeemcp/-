export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export const TOOLS: ToolDef[] = [
  {
    name: "search_token",
    description: "Search Robinhood Chain tokens, pools, and canonical Stock Tokens by ticker, name, or 0x address.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Ticker, name, or contract address" } },
      required: ["query"],
    },
  },
  {
    name: "scan_token",
    description: "OG-style Apogee scan: composite score, lookalike/ticker-collision flags, DEX vs RHJ premium, momentum, liquidity.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Ticker or token address" } },
      required: ["query"],
    },
  },
  {
    name: "get_token",
    description: "Full token intel: on-chain ERC-20 metadata plus every DexScreener market on Robinhood Chain.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string", description: "Token address or ticker" } },
      required: ["address"],
    },
  },
  {
    name: "get_chart",
    description: "OHLCV candles for the deepest Robinhood Chain pool of a token (GeckoTerminal).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Token, ticker, or pool address" },
        timeframe: { type: "string", enum: ["minute", "hour", "day"], default: "minute" },
        aggregate: { type: "number", description: "Bar aggregation, e.g. 5 for 5m", default: 5 },
      },
      required: ["query"],
    },
  },
  {
    name: "get_desk",
    description: "Trading desk snapshot: chain stats, trending pools, fresh launches, featured Stock Token oracle vs DEX.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_trending",
    description: "Trending Robinhood Chain pools right now.",
    inputSchema: {
      type: "object",
      properties: { duration: { type: "string", enum: ["5m", "1h", "6h", "24h"], default: "1h" } },
    },
  },
  {
    name: "list_launches",
    description:
      "Newest Robinhood Chain launches. Prefers on-chain pons v2/v1 TokenLaunched events (bonding-curve + Uniswap) and also returns GeckoTerminal new pools.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max pons launches to enrich (default 24)" },
        lookback: { type: "number", description: "Block lookback for factory logs (default 8000)" },
        generation: { type: "string", enum: ["all", "v1", "v2"], default: "all" },
      },
    },
  },
  {
    name: "list_pons_launches",
    description:
      "Index pons launches from factory TokenLaunched logs on Robinhood Chain. v2 is the live bonding-curve factory; v1 is Uniswap V3 vs WETH. Write pons lowercase.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
        lookback: { type: "number" },
        generation: { type: "string", enum: ["all", "v1", "v2"] },
      },
    },
  },
  {
    name: "get_pons_token",
    description:
      "Full on-chain pons launch record: metadata, socials, logo, factory tuple, curve reserves or V3 pool price, graduation progress, fee split. Resolve by token address.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string", description: "Launch token 0x address" } },
      required: ["address"],
    },
  },
  {
    name: "get_pons_graduation",
    description:
      "Graduation progress for a pons token. v1: locked WETH principal vs threshold (default 4.2 ETH). v2: realQuoteReserve vs threshold / phase. Graduation is not a quality signal.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string" } },
      required: ["address"],
    },
  },
  {
    name: "get_pons_protocol",
    description:
      "pons network facts, V1/V2 contracts, events, fee splits, reference PONS token, and attribution rules from docs.ponsfamily.com.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_top_pools",
    description: "Top Robinhood Chain pools by GeckoTerminal ranking.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_stock_tokens",
    description: "Canonical Robinhood Stock Token registry (contract, multiplier, logo) from RHJ /assets.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Optional ticker/name filter" } },
    },
  },
  {
    name: "get_stock_quote",
    description: "Official RHJ bid/ask plus live Uniswap DEX price and premium/discount in bps for a Stock Token ticker.",
    inputSchema: {
      type: "object",
      properties: { symbol: { type: "string", description: "Ticker e.g. NVDA" } },
      required: ["symbol"],
    },
  },
  {
    name: "get_holders",
    description: "Market/holder proxy for a token via pool liquidity share when explorer holder APIs are gated.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string" } },
      required: ["address"],
    },
  },
  {
    name: "get_wallet",
    description: "Read-only ETH + USDG/WETH/major Stock Token balances for any 0x address. No key required.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string" } },
      required: ["address"],
    },
  },
  {
    name: "get_chain_stats",
    description: "Robinhood Chain height, gas, TVL, canonical USDG/WETH, Stock Token count.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_transaction",
    description: "Fetch a transaction and receipt by hash from the public RPC.",
    inputSchema: {
      type: "object",
      properties: { hash: { type: "string" } },
      required: ["hash"],
    },
  },
  {
    name: "get_safety",
    description: "Safety pass: canonical vs lookalike, liquidity, oracle tracking error. Same engine as scan_token.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "verify_token",
    description: "Anti-scam: confirm a ticker's canonical Stock Token contract and list colliding tickers on-chain.",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string" },
        address: { type: "string", description: "Optional address to check against the canonical contract" },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_swap_quote",
    description: "Read-only indicative swap using live USD prices. Does not sign or broadcast.",
    inputSchema: {
      type: "object",
      properties: {
        fromToken: { type: "string" },
        toToken: { type: "string" },
        amount: { type: "string" },
      },
      required: ["fromToken", "toToken", "amount"],
    },
  },
  {
    name: "get_pair",
    description: "Details for a specific Robinhood Chain pool/pair address.",
    inputSchema: {
      type: "object",
      properties: { pair: { type: "string" } },
      required: ["pair"],
    },
  },
  {
    name: "get_corporate_actions",
    description: "Processed Stock Token corporate actions (splits, dividends) from RHJ.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "apogee_status",
    description: "Health check for Apogee MCP. No auth.",
    inputSchema: { type: "object", properties: {} },
  },
];

export const MCP_INSTRUCTIONS = `You are connected to Apogee, the Robinhood Chain intel MCP (Search / Chart / Desk / Launch).
Rules:
- This chain is EIP-155 4663. DexScreener/GeckoTerminal slug is "robinhood", never 4663.
- Resolve tokens by contract. Tickers collide — NVDA memecoins are not the NVIDIA Stock Token.
- Canonical Stock Tokens come from list_stock_tokens / RHJ. get_stock_quote shows oracle vs DEX premium.
- Never ask for a seed phrase or private key. All tools are read-only.
- Do not claim a swap executed. get_swap_quote is indicative only.
- Stock Tokens may not be offered to US/Canada/UK/Switzerland persons.
- Prefer scan_token before size, get_desk for a market snapshot, list_launches / list_pons_launches for new tokens.
pons (write the name in lowercase; link https://www.ponsfamily.com/launchpad):
- Apogee indexes pons on-chain. It is not operated by pons and does not imply partnership.
- V1: Uniswap V3 vs WETH only, 1% fee, 1e9 supply, no bonding curve, no migration. Graduation = paired WETH vs threshold (default 4.2 ETH). Trading stays in the same pool.
- V2 (live factory 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e): bonding curve then Uniswap V4. pairToken 0x0 = native ETH. phase 0 = curve, 2 = PoolCreated. Names/symbols can be copied — always check the token address.
- Graduation is not a quality signal. Use get_pons_token / get_pons_graduation for a specific address.`;
