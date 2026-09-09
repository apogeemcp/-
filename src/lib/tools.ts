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
        limit: { type: "number", description: "Candle count, max 1000", default: 180 },
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
    description: "Holder concentration proxy from recent explorer transfers plus DexScreener pool liquidity. Not a full ledger.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string" } },
      required: ["address"],
    },
  },
  {
    name: "get_token_activity",
    description: "Recent buy/sell/burn transfers for a Robinhood Chain token from Blockscout tokentx plus DexScreener pairs.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Token address or ticker" } },
      required: ["query"],
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
    description: "Health check for Apogee MCP. Reports 3000 catalog operations, chain stats, and the live MCP URL.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search_catalog",
    description: "Search all 3000 Robinhood Chain catalog operations by name or topic (wallet, analytics, pons, stocks).",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "number" } },
      required: ["query"],
    },
  },
  {
    name: "run_tool",
    description: "Invoke any of the 3000 catalog operations by exact name, including aliases like scan_NVDA or volume_1h.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Catalog tool name" },
        arguments: { type: "object" },
      },
      required: ["name"],
    },
  },
  {
    name: "list_catalog_page",
    description: "Page through the 3000-operation catalog.",
    inputSchema: {
      type: "object",
      properties: { offset: { type: "number" }, limit: { type: "number" } },
    },
  },
  {
    name: "get_wallet_txs",
    description: "Explorer native + ERC-20 transfers for a Robinhood Chain wallet.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string" }, page: { type: "number" }, offset: { type: "number" } },
      required: ["address"],
    },
  },
  {
    name: "get_wallet_tokens",
    description: "ETH plus watched USDG/WETH/Stock Token balances for a wallet.",
    inputSchema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] },
  },
  {
    name: "get_wallet_pnl",
    description: "Mark-to-market wallet equity on Robinhood Chain using DexScreener USD prices.",
    inputSchema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] },
  },
  {
    name: "track_wallet",
    description: "Full wallet tracker: balances, PnL, recent flow. Read-only.",
    inputSchema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] },
  },
  {
    name: "get_wallet_flow",
    description: "In/out transfer counts and counterparties for a wallet.",
    inputSchema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] },
  },
  {
    name: "get_token_analytics",
    description: "Volume, txns, liquidity, and change for a token over 5m/1h/6h/24h.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, window: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "get_top_traders",
    description: "Top flow wallets for a token from recent explorer transfers.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "get_smart_money",
    description: "Repeat-buy wallets in the recent transfer window (smart-money proxy).",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "get_first_buyers",
    description: "Earliest explorer token transfers for a Robinhood Chain token.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "list_boosted",
    description: "Latest DexScreener boosted tokens on Robinhood Chain.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_gas_oracle",
    description: "Live gas price on Robinhood Chain.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_block",
    description: "Fetch a block by number or latest.",
    inputSchema: { type: "object", properties: { id: { type: "string" } } },
  },
  {
    name: "get_contract",
    description: "ERC-20 metadata and market count for a contract.",
    inputSchema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] },
  },
  {
    name: "compare_tokens",
    description: "Side-by-side analytics for two tickers or addresses.",
    inputSchema: {
      type: "object",
      properties: { a: { type: "string" }, b: { type: "string" } },
      required: ["a", "b"],
    },
  },
  {
    name: "get_market_overview",
    description: "TVL, gas, and trending pools snapshot.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "preview_pons_launch",
    description: "Read pons v2 launch fee, economics pin, and factory status. Does not send a transaction.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" }, symbol: { type: "string" }, launchConfigId: { type: "number" } },
    },
  },
  {
    name: "prepare_pons_launch",
    description:
      "Build an unsigned pons v2 launchToken transaction for Phantom (ETH) on Robinhood Chain. User must sign. Apogee never holds keys.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        symbol: { type: "string" },
        description: { type: "string" },
        logo: { type: "string" },
        twitter: { type: "string" },
        telegram: { type: "string" },
        website: { type: "string" },
        creatorFeeRecipient: { type: "string" },
        creatorTaxBps: { type: "number" },
        buybackEnabled: { type: "boolean" },
        launchConfigId: { type: "number" },
      },
      required: ["name", "symbol"],
    },
  },
  {
    name: "prepare_pons_buy",
    description: "Indicative pons buy helper plus the pons app URL. Does not broadcast.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string" }, ethAmount: { type: "string" } },
      required: ["address"],
    },
  },
  {
    name: "get_curve_quote",
    description: "Bonding-curve / graduation state for a pons token.",
    inputSchema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] },
  },
  {
    name: "add_robinhood_chain",
    description: "wallet_addEthereumChain params so Phantom or MetaMask can add Robinhood Chain (4663).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_mcp_info",
    description: "Canonical live MCP URL https://apogeemcp.digital/api/mcp and one-click install targets.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "write_onchain_note",
    description:
      "Write a permanent Solana memo (ORBITX_NOTE:v1) via the Apogee service wallet, then buy and burn ~$0.03 of $ORBITX (keeping a $0.15 float). Public and irreversible. Rate limited. Returns signature + Solscan URL. Never send secrets.",
    inputSchema: {
      type: "object",
      properties: {
        note: { type: "string", description: "UTF-8 note, max 240 characters. Permanent and public." },
        idempotencyKey: { type: "string", description: "Repeat the same key to avoid a second memo/burn." },
        wallet: { type: "string", description: "Optional attribution address." },
      },
      required: ["note"],
    },
  },
  {
    name: "get_onchain_note",
    description: "Fetch a verified on-chain note by Solana transaction signature.",
    inputSchema: {
      type: "object",
      properties: { signature: { type: "string", description: "Solana transaction signature" } },
      required: ["signature"],
    },
  },
  {
    name: "list_onchain_notes",
    description: "List on-chain notes by reading confirmed Solana memos from the service wallet.",
    inputSchema: {
      type: "object",
      properties: {
        wallet: { type: "string" },
        search: { type: "string" },
        limit: { type: "number" },
        offset: { type: "number" },
      },
    },
  },
  {
    name: "get_onchain_activity",
    description: "Public on-chain activity feed: memos, $ORBITX buys, and burns with Solscan links.",
    inputSchema: {
      type: "object",
      properties: {
        eventType: { type: "string", enum: ["ALL", "MEMOS", "BUYS", "BURNS", "MEMO_CREATED", "ORBITX_PURCHASE", "ORBITX_BURN"] },
        limit: { type: "number" },
        offset: { type: "number" },
      },
    },
  },
  {
    name: "get_service_wallet_status",
    description: "Public service wallet address, SOL/$ORBITX balances, memo/buy/burn totals. Never returns private keys.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "write_token_seal",
    description:
      "Pick a supported Solana token ($ORBITX or $ROKHA), write a public memo, permanently store an image (Irys/Arweave + 1/1 mint), then buy and burn up to $0.25 of that token from the Apogee service wallet. Public and irreversible. Rate limited. Never send secrets. imageBase64 required.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string", description: "Token id, symbol, or mint. Supported: $ORBITX, $ROKHA." },
        note: { type: "string", description: "UTF-8 memo, max 180 characters. Permanent and public." },
        imageBase64: { type: "string", description: "JPEG/PNG/WebP as raw or data-URL base64." },
        imageMime: { type: "string", description: "image/jpeg, image/png, or image/webp." },
        usd: { type: "number", description: "Burn size in USD, max 0.25." },
        wallet: { type: "string", description: "Optional attribution address." },
      },
      required: ["token", "note", "imageBase64"],
    },
  },
  {
    name: "list_token_seals",
    description: "List confirmed Apogee token seals (memo + permanent image + buy/burn) from the service wallet.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "list_burn_tokens",
    description: "Supported tokens the service wallet can buy and burn on a token seal. Currently $ORBITX and $ROKHA, max $0.25 each.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "burn_orbitx",
    description: "Admin-only: burn $ORBITX held by the service wallet. Requires adminSecret. Not a generic transaction signer.",
    inputSchema: {
      type: "object",
      properties: { adminSecret: { type: "string" }, amount: { type: "number" } },
      required: ["adminSecret"],
    },
  },
];

export const MCP_INSTRUCTIONS = `You are connected to Apogee, the Robinhood Chain intel MCP (Search / Chart / Desk / Launch / Track).
Canonical URL: https://apogeemcp.digital/api/mcp (alias /mcp). Auth: none.
The catalog has 3000 Robinhood Chain operations. tools/list returns the primary tools; search_catalog + run_tool invoke any alias (scan_NVDA, volume_1h, wallet_pnl_1, pons_curve_v2, …).
Rules:
- This chain is EIP-155 4663. DexScreener/GeckoTerminal slug is "robinhood", never 4663.
- Resolve tokens by contract. Tickers collide — NVDA memecoins are not the NVIDIA Stock Token.
- Canonical Stock Tokens come from list_stock_tokens / RHJ. get_stock_quote shows oracle vs DEX premium.
- Never ask for a seed phrase or private key.
- Wallet tracking (track_wallet, get_wallet_pnl, get_wallet_txs) is read-only.
- prepare_pons_launch returns an unsigned tx for the user to sign in Phantom (ethereum provider) after wallet_addEthereumChain for 4663. Do not claim a launch or swap executed unless the user reports a tx hash.
- On-chain notes: write_onchain_note records a public Solana memo via the Apogee service wallet and buys ~$0.03 of $ORBITX to burn, keeping a $0.15 float. Notes are permanent. Never put secrets or personal data in a memo. Repeat idempotencyKey to avoid duplicates. burn_orbitx is admin-only.
- Token seals: write_token_seal lets a user pick $ORBITX or $ROKHA, attach an image (base64), and write a memo. The service wallet stores the image forever, mints a 1/1, then buys and burns up to $0.25 of that token. Public and irreversible.
- Stock Tokens may not be offered to US/Canada/UK/Switzerland persons.
- Prefer scan_token before size, get_desk for a market snapshot, list_launches / list_pons_launches for new tokens, track_wallet for an address.
pons (write the name in lowercase; link https://www.ponsfamily.com/launchpad):
- Apogee indexes pons on-chain. It is not operated by pons and does not imply partnership.
- V1: Uniswap V3 vs WETH only, 1% fee, 1e9 supply, no bonding curve, no migration. Graduation = paired WETH vs threshold (default 4.2 ETH).
- V2 (live factory 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e): bonding curve then Uniswap V4. pairToken 0x0 = native ETH. Launch via prepare_pons_launch + Phantom.
- Graduation is not a quality signal.`;
