import { TOOLS, type ToolDef } from "./tools";

export const CATALOG_SIZE = 3000;

const TICKERS = [
  "AAPL","NVDA","TSLA","MSFT","AMZN","GOOGL","META","SPY","QQQ","MSTR","COIN","AMD","NFLX","INTC","BABA","PLTR",
  "UBER","SQ","SHOP","CRM","ORCL","AVGO","ASML","TSM","NKE","DIS","BA","JPM","GS","V","MA","WMT","COST","HD",
  "PEP","KO","MCD","SBUX","NVO","LLY","UNH","JNJ","PFE","MRNA","XOM","CVX","COP","OXY","GE","CAT","DE","HON",
  "IBM","CSCO","QCOM","TXN","AMAT","LRCX","KLAC","MU","SMCI","ARM","SNOW","NET","DDOG","CRWD","PANW","ZS",
  "NOW","ADBE","INTU","PYPL","HOOD","SOFI","AFRM","RBLX","U","PATH","AI","C3AI","BILL","TOST","ABNB","BKNG",
  "MAR","HLT","DAL","UAL","AAL","LUV","F","GM","RIVN","LCID","NIO","XPEV","LI","TM","HMC","SONY","SNE",
  "T","VZ","TMUS","CMCSA","NFL","ROKU","SPOT","SNAP","PINS","RDDT","GME","AMC","BBBY","KOSS","BB","NOK",
  "GOLD","GLD","SLV","IAU","USO","UNG","TLT","HYG","LQD","IWM","DIA","VOO","VTI","ARKK","ARKW","ARKG",
  "IWM","EEM","EFA","FXI","KWEB","GDX","GDXJ","XLF","XLE","XLK","XLV","XLI","XLY","XLP","XLU","XLRE",
  "IYR","VNQ","BITO","IBIT","FBTC","GBTC","ETHE","MSTR","MARA","RIOT","CLSK","HUT","BTBT","COIN","HOOD",
  "NVDA","TSLA","AAPL","MSFT","AMZN","META","GOOG","BRK","UNH","JNJ","V","MA","PG","HD","ABBV","MRK",
  "WFC","BAC","C","MS","BLK","SCHW","AXP","USB","PNC","TFC","BK","STT","SPGI","MCO","ICE","CME","NDAQ",
  "MMM","ITW","EMR","ETN","PH","ROK","DOV","IR","CARR","OTIS","TT","JCI","AME","FTV","XYL","PNR","IR",
].filter((v, i, a) => a.indexOf(v) === i);

const WINDOWS = ["1m","5m","15m","1h","2h","4h","6h","12h","24h","3d","7d","14d","30d"] as const;
const METRICS = [
  "volume","liquidity","txns","buys","sells","premium","momentum","volatility","fdv","mcap","holders","flow",
  "smart_money","snipers","fees","tvl","open_interest","depth","spread","impact",
] as const;
const WALLET_VIEWS = ["pnl","txs","tokens","flow","labels","funding","related","first_tx","gas","approvals"] as const;
const LAUNCH_VIEWS = ["curve","graduation","holders","dev","bundle","socials","safety","buys"] as const;

export type CatalogEntry = ToolDef & {
  impl: string;
  bound?: Record<string, unknown>;
  family: string;
};

function tool(
  name: string,
  description: string,
  impl: string,
  family: string,
  bound?: Record<string, unknown>,
  extraProps?: Record<string, unknown>,
): CatalogEntry {
  return {
    name,
    description,
    impl,
    family,
    bound,
    inputSchema: {
      type: "object",
      properties: extraProps || {},
    },
  };
}

let cached: CatalogEntry[] | null = null;

export function buildCatalog(): CatalogEntry[] {
  if (cached) return cached;
  const out: CatalogEntry[] = [];
  const seen = new Set<string>();
  const add = (entry: CatalogEntry) => {
    if (seen.has(entry.name) || out.length >= CATALOG_SIZE) return;
    seen.add(entry.name);
    out.push(entry);
  };

  for (const t of TOOLS) {
    add({ ...t, impl: t.name, family: "core" });
  }

  const scanOps: Array<[string, string, string]> = [
    ["scan", "scan_token", "OG-style Apogee scan"],
    ["quote", "get_stock_quote", "RHJ oracle vs DEX quote"],
    ["chart", "get_chart", "OHLCV candles"],
    ["holders", "get_holders", "Holder / liquidity proxy"],
    ["safety", "get_safety", "Safety pass"],
    ["verify", "verify_token", "Canonical vs lookalike"],
    ["token", "get_token", "Full token intel"],
    ["analytics", "get_token_analytics", "Volume, flow, and momentum analytics"],
    ["traders", "get_top_traders", "Top flow wallets proxy"],
    ["compare", "compare_tokens", "Compare vs NVDA / peers"],
  ];
  for (const ticker of TICKERS) {
    for (const [prefix, impl, label] of scanOps) {
      add(
        tool(
          `${prefix}_${ticker}`,
          `${label} for ${ticker} on Robinhood Chain.`,
          impl,
          "stock",
          impl === "get_stock_quote" || impl === "verify_token"
            ? { symbol: ticker, ticker }
            : { query: ticker, address: ticker, symbol: ticker },
        ),
      );
    }
  }

  for (const metric of METRICS) {
    for (const window of WINDOWS) {
      add(
        tool(
          `${metric}_${window}`,
          `Robinhood Chain ${metric} analytics over ${window}.`,
          "get_token_analytics",
          "analytics",
          { metric, window, duration: window },
          { query: { type: "string", description: "Token, ticker, or pair" } },
        ),
      );
    }
  }

  for (const view of WALLET_VIEWS) {
    for (let page = 1; page <= 12; page++) {
      add(
        tool(
          `wallet_${view}_${page}`,
          `Wallet ${view} page ${page} on Robinhood Chain.`,
          view === "pnl" ? "get_wallet_pnl" : view === "tokens" ? "get_wallet_tokens" : "get_wallet_txs",
          "wallet",
          { view, page, limit: 50 },
          { address: { type: "string", description: "0x wallet" } },
        ),
      );
    }
  }

  for (const view of LAUNCH_VIEWS) {
    for (const gen of ["v1", "v2", "all"] as const) {
      add(
        tool(
          `pons_${view}_${gen}`,
          `pons ${view} for ${gen} launches on Robinhood Chain. Write pons lowercase.`,
          view === "graduation" ? "get_pons_graduation" : view === "curve" ? "get_curve_quote" : "list_pons_launches",
          "launch",
          { generation: gen, view },
          { address: { type: "string" }, limit: { type: "number" } },
        ),
      );
    }
  }

  const extras: Array<[string, string, string, Record<string, unknown>?]> = [
    ["trend_5m", "list_trending", "Trending pools 5m", { duration: "5m" }],
    ["trend_1h", "list_trending", "Trending pools 1h", { duration: "1h" }],
    ["trend_6h", "list_trending", "Trending pools 6h", { duration: "6h" }],
    ["trend_24h", "list_trending", "Trending pools 24h", { duration: "24h" }],
    ["boosted_now", "list_boosted", "DexScreener boosted tokens", {}],
    ["gas_now", "get_gas_oracle", "Live gas oracle", {}],
    ["desk_now", "get_desk", "Trading desk snapshot", {}],
    ["chain_now", "get_chain_stats", "Chain stats", {}],
    ["mcp_card", "get_mcp_info", "Canonical MCP install card", {}],
  ];
  for (const [name, impl, desc, bound] of extras) {
    add(tool(name, desc, impl, "live", bound));
  }

  let i = 0;
  while (out.length < CATALOG_SIZE) {
    const ticker = TICKERS[i % TICKERS.length];
    const window = WINDOWS[i % WINDOWS.length];
    add(
      tool(
        `rh_${ticker.toLowerCase()}_${window}_${i}`,
        `Robinhood Chain intel pack for ${ticker} over ${window}.`,
        "scan_token",
        "pack",
        { query: ticker, window },
      ),
    );
    i += 1;
    if (i > CATALOG_SIZE * 2) break;
  }

  cached = out.slice(0, CATALOG_SIZE);
  return cached;
}

export function catalogEntry(name: string): CatalogEntry | undefined {
  return buildCatalog().find((t) => t.name === name);
}

export function searchCatalog(query: string, limit = 40): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return buildCatalog().slice(0, limit);
  const scored = buildCatalog()
    .map((t) => {
      const hay = `${t.name} ${t.description} ${t.family}`.toLowerCase();
      let score = 0;
      if (t.name === q) score += 100;
      if (t.name.includes(q)) score += 40;
      if (hay.includes(q)) score += 10;
      for (const part of q.split(/\s+/)) if (hay.includes(part)) score += 3;
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.t);
}
