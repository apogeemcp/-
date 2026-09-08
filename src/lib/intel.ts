import { CHAIN, ENDPOINTS, TOKENS, isAddress, dexTokenUrl, explorerToken, explorerAddress } from "./chain";
import { fetchJson, erc20Meta, erc20Balance, nativeBalance, latestBlock, gasPriceWei, getTransaction, formatUnits } from "./rpc";
import { computeApogeeScore, momentumScore } from "./score";
import { getPonsGraduation, getPonsProtocol, getPonsToken, listPonsLaunches, PONS } from "./pons";
import {
  addRobinhoodChainParams,
  compareTokens,
  getBlockTool,
  getContractMeta,
  getFirstBuyers,
  getHolderProxy,
  getTokenActivity,
  getGasOracle,
  getMarketOverview,
  getSmartMoney,
  getTokenAnalytics,
  getTopTraders,
  getWalletFlow,
  getWalletPnl,
  getWalletTokens,
  getWalletTxs,
  trackWallet,
} from "./track";
import { getCurveQuote, getMcpInfo, preparePonsBuy, preparePonsLaunch, previewPonsLaunch } from "./launch";
import { CATALOG_SIZE } from "./catalog";
import { mcpHttpUrl } from "./site";
import { mediaUrl } from "./media";

export type DsPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  labels?: string[];
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; name?: string; symbol?: string };
  liquidity?: { usd?: number; base?: number; quote?: number };
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?: {
    m5?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
    h6?: { buys?: number; sells?: number };
    h24?: { buys?: number; sells?: number };
  };
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    header?: string;
    websites?: Array<{ url?: string }>;
    socials?: Array<{ type?: string; url?: string }>;
  };
};

export type StockAsset = {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  contractAddress: string;
  currentMultiplier: string;
  status: string;
  logoUrl: string | null;
};

type CacheEntry<T> = { at: number; value: T };
const mem = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = mem.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  return fn().then((value) => {
    mem.set(key, { at: Date.now(), value });
    return value;
  });
}

function rhPairs(pairs: DsPair[] | null | undefined): DsPair[] {
  return (pairs || []).filter((p) => (p.chainId || "").toLowerCase() === CHAIN.slug);
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function ageDaysFromMs(ms: number | null | undefined): number | null {
  if (!ms || !Number.isFinite(ms)) return null;
  return Math.max(0, Math.round((Date.now() - ms) / 86_400_000));
}

export async function loadStockAssets(): Promise<StockAsset[]> {
  return cached("rhj-assets", 10 * 60_000, async () => {
    const res = await fetchJson<{ assets?: Array<Record<string, unknown>> }>(`${ENDPOINTS.rhj}/assets`);
    const assets = res.data?.assets || [];
    const out: StockAsset[] = [];
    for (const a of assets) {
      const deps = (a.deployments as Array<Record<string, unknown>> | undefined) || [];
      const dep = deps.find((d) => Number(d.chainId) === CHAIN.id) || deps[0];
      if (!dep?.contractAddress) continue;
      out.push({
        id: String(a.id || ""),
        tokenSymbol: String(a.tokenSymbol || ""),
        tokenName: String(a.tokenName || ""),
        contractAddress: String(dep.contractAddress),
        currentMultiplier: String(a.currentMultiplier || "1"),
        status: String(a.status || ""),
        logoUrl: (a.logoUrl as string) || null,
      });
    }
    return out;
  });
}

export async function stockQuote(symbol: string): Promise<Record<string, unknown> | null> {
  const res = await fetchJson<{ quotes?: Array<Record<string, unknown>> }>(
    `${ENDPOINTS.rhj}/prices/${encodeURIComponent(symbol.toUpperCase())}`,
  );
  return res.data?.quotes?.[0] || null;
}

export async function corporateActions(limit = 25): Promise<unknown[]> {
  const res = await fetchJson<{ corpActions?: unknown[] }>(`${ENDPOINTS.rhj}/corporate-actions`);
  return (res.data?.corpActions || []).slice(0, limit);
}

export async function searchDex(query: string): Promise<DsPair[]> {
  const res = await fetchJson<{ pairs?: DsPair[] }>(
    `${ENDPOINTS.dex}/latest/dex/search?q=${encodeURIComponent(query)}`,
  );
  return rhPairs(res.data?.pairs).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
}

export async function tokenPairs(address: string): Promise<DsPair[]> {
  const res = await fetchJson<{ pairs?: DsPair[] }>(`${ENDPOINTS.dex}/latest/dex/tokens/${address}`);
  const pairs = rhPairs(res.data?.pairs);
  if (pairs.length) return pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  const alt = await fetchJson<DsPair[]>(`${ENDPOINTS.dex}/token-pairs/v1/${CHAIN.slug}/${address}`);
  return (Array.isArray(alt.data) ? alt.data : []).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
}

export async function pairByAddress(pairAddress: string): Promise<DsPair | null> {
  const res = await fetchJson<{ pair?: DsPair; pairs?: DsPair[] }>(
    `${ENDPOINTS.dex}/latest/dex/pairs/${CHAIN.slug}/${pairAddress}`,
  );
  return res.data?.pair || res.data?.pairs?.[0] || null;
}

type GeckoPool = {
  id?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
};

function geckoPools(data: GeckoPool[] | undefined) {
  return (data || []).map((row) => {
    const a = (row.attributes || {}) as Record<string, unknown>;
    const pc = (a.price_change_percentage as Record<string, unknown>) || {};
    return {
      id: row.id,
      address: a.address,
      name: a.name,
      priceUsd: num(a.base_token_price_usd),
      fdvUsd: num(a.fdv_usd),
      marketCapUsd: num(a.market_cap_usd),
      createdAt: a.pool_created_at,
      reserveUsd: num(a.reserve_in_usd),
      volume24h: num((a.volume_usd as Record<string, unknown> | undefined)?.h24),
      change5m: num(pc.m5),
      change1h: num(pc.h1),
      change6h: num(pc.h6),
      change24h: num(pc.h24),
      txns24h: (a.transactions as Record<string, unknown> | undefined)?.h24 ?? null,
    };
  });
}

export async function trendingPools(duration = "1h") {
  const res = await fetchJson<{ data?: GeckoPool[] }>(
    `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/trending_pools?duration=${encodeURIComponent(duration)}`,
    { headers: { accept: "application/json;version=20230302" } },
  );
  return geckoPools(res.data?.data);
}

export async function newPools() {
  const res = await fetchJson<{ data?: GeckoPool[] }>(
    `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/new_pools?page=1`,
    { headers: { accept: "application/json;version=20230302" } },
  );
  return geckoPools(res.data?.data);
}

export async function topPools() {
  const res = await fetchJson<{ data?: GeckoPool[] }>(
    `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/pools?page=1`,
    { headers: { accept: "application/json;version=20230302" } },
  );
  return geckoPools(res.data?.data);
}

export async function ohlcv(pool: string, timeframe = "minute", aggregate = 5, limit = 120) {
  const res = await fetchJson<{ data?: { attributes?: { ohlcv_list?: number[][] } } }>(
    `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/pools/${pool}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${Math.min(limit, 1000)}&currency=usd`,
    { headers: { accept: "application/json;version=20230302" } },
  );
  const rows = res.data?.data?.attributes?.ohlcv_list || [];
  return rows
    .slice()
    .reverse()
    .map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));
}

export async function llamaTvl(): Promise<number | null> {
  const res = await fetchJson<Array<{ name?: string; chainId?: number; tvl?: number }>>(`${ENDPOINTS.llama}/v2/chains`);
  const hit = (res.data || []).find((c) => c.chainId === CHAIN.id || c.name === "Robinhood Chain");
  return hit?.tvl ?? null;
}

export async function boostedTokens() {
  const res = await fetchJson<Array<Record<string, unknown>>>(`${ENDPOINTS.dex}/token-boosts/latest/v1`);
  return (res.data || []).filter((x) => String(x.chainId || "").toLowerCase() === CHAIN.slug);
}

function socialsFromPair(p: DsPair | null) {
  const socials = p?.info?.socials || [];
  const x = socials.find((s) => s.type === "twitter")?.url || null;
  const telegram = socials.find((s) => s.type === "telegram")?.url || null;
  return {
    x,
    telegram,
    website: p?.info?.websites?.[0]?.url || null,
    image: p?.info?.imageUrl || null,
    banner: p?.info?.header || null,
  };
}

function pickBestPair(pairs: DsPair[]): DsPair | null {
  return pairs[0] || null;
}

function tokenFromPair(p: DsPair) {
  return {
    address: p.baseToken?.address || "",
    name: p.baseToken?.name || "",
    symbol: p.baseToken?.symbol || "",
    quote: p.quoteToken,
    pairAddress: p.pairAddress,
    dexId: p.dexId,
    priceUsd: num(p.priceUsd),
    liquidityUsd: p.liquidity?.usd ?? null,
    volume24h: p.volume?.h24 ?? null,
    fdv: p.fdv ?? null,
    marketCap: p.marketCap ?? p.fdv ?? null,
    priceChange: p.priceChange || null,
    txns24h: p.txns?.h24 || null,
    createdAt: p.pairCreatedAt || null,
    url: p.url || (p.baseToken?.address ? dexTokenUrl(p.baseToken.address) : null),
    socials: socialsFromPair(p),
  };
}

export async function searchToken(query: string) {
  const q = query.trim();
  if (!q) return { query: q, stocks: [], pairs: [], pons: null, note: "empty query" };
  const ponsPromise = isAddress(q) ? getPonsToken(q).catch(() => null) : Promise.resolve(null);
  const [assets, pairs, pons] = await Promise.all([loadStockAssets(), searchDex(q), ponsPromise]);
  const qLower = q.toLowerCase();
  const stocks = assets.filter((a) => {
    if (isAddress(q) && a.contractAddress.toLowerCase() === q.toLowerCase()) return true;
    return (
      a.tokenSymbol.toLowerCase() === qLower ||
      a.tokenSymbol.toLowerCase().includes(qLower) ||
      a.tokenName.toLowerCase().includes(qLower)
    );
  });
  return {
    query: q,
    chain: CHAIN.slug,
    stocks: stocks.slice(0, 12),
    pairs: pairs.slice(0, 20).map(tokenFromPair),
    pons: pons && "ok" in pons && pons.ok ? pons : null,
  };
}

export async function scanToken(query: string) {
  const q = query.trim();
  const [assets, search] = await Promise.all([loadStockAssets(), isAddress(q) ? tokenPairs(q) : searchDex(q)]);
  const pairs = search;
  if (!pairs.length && !isAddress(q)) {
    const stock = assets.find((a) => a.tokenSymbol.toLowerCase() === q.toLowerCase());
    if (stock) {
      const stockPairs = await tokenPairs(stock.contractAddress);
      pairs.push(...stockPairs);
    }
  }
  const best = pickBestPair(pairs);
  if (!best?.baseToken?.address) {
    if (isAddress(q)) {
      const ponsOnly = await getPonsToken(q).catch(() => null);
      if (ponsOnly && "ok" in ponsOnly && ponsOnly.ok) {
        return {
          ok: true,
          query: q,
          token: {
            address: ponsOnly.token,
            name: ponsOnly.meta?.name,
            symbol: ponsOnly.meta?.symbol,
            image: mediaUrl(ponsOnly.meta?.logo || null),
            priceUsd: ponsOnly.priceUsd ?? null,
            mcap: ponsOnly.marketCapUsd ?? null,
            liquidity: null,
            canonicalStock: false,
            pons: true,
          },
          pons: ponsOnly,
          score: { total: 35, verdict: "PONS LAUNCH — resolve by address, graduation is not quality" },
          flags: { tickerCollision: false, canonicalStock: false, unverifiedLookalike: false },
          verdict: "PONS LAUNCH — curve or locked pool; always verify the contract",
        };
      }
    }
    return { ok: false, error: `No Robinhood Chain market found for "${q}".` };
  }
  const address = best.baseToken.address;
  const symbol = best.baseToken.symbol || "";
  const canonical = assets.find((a) => a.contractAddress.toLowerCase() === address.toLowerCase());
  const collisions = assets.filter((a) => a.tokenSymbol.toLowerCase() === symbol.toLowerCase());
  const sameTickerPairs = pairs.filter((p) => (p.baseToken?.symbol || "").toLowerCase() === symbol.toLowerCase());
  const uniqueAddrs = new Set(sameTickerPairs.map((p) => (p.baseToken?.address || "").toLowerCase()).filter(Boolean));
  const rhj = canonical ? await stockQuote(canonical.tokenSymbol) : symbol ? await stockQuote(symbol).catch(() => null) : null;
  const bid = num((rhj as { bid?: string } | null)?.bid);
  const ask = num((rhj as { ask?: string } | null)?.ask);
  const mid = bid != null && ask != null ? (bid + ask) / 2 : bid ?? ask;
  const dexPrice = num(best.priceUsd);
  const premiumBps = mid && dexPrice ? Math.round(((dexPrice - mid) / mid) * 10_000) : null;
  const liq = best.liquidity?.usd || 0;
  const mcap = best.marketCap || best.fdv || 0;
  const created = best.pairCreatedAt || null;
  const buys = best.txns?.h24?.buys ?? null;
  const sells = best.txns?.h24?.sells ?? null;
  const vol = best.volume?.h24 ?? null;
  const { score, flags } = computeApogeeScore({
    canonicalStock: Boolean(canonical),
    collisionCount: Math.max(uniqueAddrs.size, collisions.length || 0, 1),
    liquidityUsd: liq,
    mcapUsd: mcap,
    ageDays: ageDaysFromMs(created),
    poolAgeDays: ageDaysFromMs(created),
    holderCount: null,
    topHoldersPct: null,
    hasWebsite: Boolean(best.info?.websites?.[0]?.url),
    verifiedName: Boolean(canonical) || (best.baseToken?.name || "").includes("Robinhood Token"),
    premiumBps,
  });
  const mom = momentumScore(best.priceChange?.h24 ?? null, buys, sells, liq > 0 && vol ? vol / liq : null);
  const pons = await getPonsToken(address).catch(() => null);
  const ponsHit = pons && "ok" in pons && pons.ok ? pons : null;
  return {
    ok: true,
    query: q,
    token: {
      address,
      name: best.baseToken?.name,
      symbol,
      image: mediaUrl(best.info?.imageUrl || canonical?.logoUrl || ponsHit?.meta?.logo || null),
      priceUsd: dexPrice,
      mcap,
      fdv: best.fdv ?? null,
      liquidity: liq,
      volume24h: vol,
      priceChange: best.priceChange || null,
      pairAddress: best.pairAddress,
      dexId: best.dexId,
      createdAt: created,
      ageDays: ageDaysFromMs(created),
      dexUrl: best.url || dexTokenUrl(address),
      explorer: explorerToken(address),
      socials: socialsFromPair(best),
      momentum: mom.momentum,
      momentumLabel: mom.label,
      canonicalStock: Boolean(canonical),
      multiplier: canonical?.currentMultiplier || null,
      rhjQuote: rhj,
      dexPremiumBps: premiumBps,
      collisions: [...uniqueAddrs].filter((a) => a !== address.toLowerCase()).slice(0, 8),
    },
    pons: ponsHit,
    score,
    flags,
    verdict: score.verdict,
  };
}

export async function getToken(addressOrSymbol: string) {
  const scan = await scanToken(addressOrSymbol);
  if (!scan.ok || !("token" in scan) || !scan.token) return scan;
  const address = scan.token.address as string;
  const [meta, pairs] = await Promise.all([erc20Meta(address).catch(() => null), tokenPairs(address)]);
  return {
    ok: true,
    token: scan.token,
    onchain: meta,
    markets: pairs.slice(0, 12).map(tokenFromPair),
    score: scan.score,
    flags: scan.flags,
    verdict: scan.verdict,
  };
}

export async function getDesk() {
  const [trend, geckoLaunches, ponsLaunches, assets, tvl, block, boosted] = await Promise.all([
    trendingPools("1h"),
    newPools(),
    listPonsLaunches({ limit: 12, lookback: 8_000 }).catch(() => ({ launches: [] as unknown[] })),
    loadStockAssets(),
    llamaTvl(),
    latestBlock().catch(() => ({ number: 0, timestamp: null })),
    boostedTokens().catch(() => []),
  ]);
  const featured = ["NVDA", "AAPL", "TSLA", "SPY", "MSTR", "AMZN", "META", "GOOGL"];
  const quotes = await Promise.all(
    featured.map(async (sym) => {
      const asset = assets.find((a) => a.tokenSymbol === sym);
      const [rhj, pairs] = await Promise.all([
        stockQuote(sym).catch(() => null),
        asset ? tokenPairs(asset.contractAddress).catch(() => []) : Promise.resolve([]),
      ]);
      const best = pairs[0];
      const bid = num((rhj as { bid?: string } | null)?.bid);
      const ask = num((rhj as { ask?: string } | null)?.ask);
      const mid = bid != null && ask != null ? (bid + ask) / 2 : null;
      const dex = num(best?.priceUsd);
      return {
        symbol: sym,
        name: asset?.tokenName || sym,
        address: asset?.contractAddress || null,
        logo: asset?.logoUrl || null,
        bid,
        ask,
        mid,
        dexPrice: dex,
        premiumBps: mid && dex ? Math.round(((dex - mid) / mid) * 10_000) : null,
        liquidity: best?.liquidity?.usd ?? null,
        volume24h: best?.volume?.h24 ?? null,
      };
    }),
  );
  return {
    chain: {
      id: CHAIN.id,
      name: CHAIN.name,
      rpc: CHAIN.rpc,
      explorer: CHAIN.explorer,
      block: block.number,
      tvlUsd: tvl,
      stockTokens: assets.length,
    },
    trending: trend.slice(0, 12),
    launches: ("launches" in ponsLaunches ? ponsLaunches.launches : []) as unknown[],
    geckoLaunches: geckoLaunches.slice(0, 12),
    stocks: quotes,
    pons: {
      app: PONS.app,
      attribution: PONS.attribution,
    },
    boosted: boosted.slice(0, 10),
  };
}

export async function getChainStats() {
  const [block, gas, tvl, assets] = await Promise.all([
    latestBlock(),
    gasPriceWei(),
    llamaTvl(),
    loadStockAssets(),
  ]);
  return {
    chainId: CHAIN.id,
    name: CHAIN.name,
    block: block.number,
    blockTime: block.timestamp,
    gasPriceWei: gas.toString(),
    gasPriceGwei: Number(gas) / 1e9,
    tvlUsd: tvl,
    stockTokenCount: assets.length,
    rpc: CHAIN.rpc,
    explorer: CHAIN.explorer,
    canonical: TOKENS,
  };
}

export async function getWallet(address: string) {
  if (!isAddress(address)) return { ok: false, error: "Provide a 0x address." };
  const assets = await loadStockAssets();
  const focus = [
    TOKENS.USDG,
    TOKENS.WETH,
    ...["NVDA", "AAPL", "TSLA", "SPY"]
      .map((s) => assets.find((a) => a.tokenSymbol === s)?.contractAddress)
      .filter((x): x is string => Boolean(x)),
  ];
  const [eth, metas] = await Promise.all([
    nativeBalance(address),
    Promise.all(
      focus.map(async (token) => {
        const [bal, meta] = await Promise.all([erc20Balance(token, address), erc20Meta(token)]);
        const decimals = meta.decimals ?? 18;
        return {
          token,
          symbol: meta.symbol,
          name: meta.name,
          decimals,
          raw: bal.toString(),
          formatted: formatUnits(bal, decimals),
        };
      }),
    ),
  ]);
  return {
    ok: true,
    address,
    explorer: explorerAddress(address),
    native: { symbol: "ETH", raw: eth.toString(), formatted: formatUnits(eth, 18) },
    tokens: metas.filter((t) => t.raw !== "0"),
    note: "Read-only. Stock Token raw balances do not apply uiMultiplier; use list_stock_tokens + get_stock_quote for share math.",
  };
}

export async function getStockQuoteTool(symbol: string) {
  const assets = await loadStockAssets();
  const asset = assets.find((a) => a.tokenSymbol.toLowerCase() === symbol.trim().toLowerCase());
  if (!asset) return { ok: false, error: `No canonical Stock Token named ${symbol}.` };
  const [rhj, pairs] = await Promise.all([stockQuote(asset.tokenSymbol), tokenPairs(asset.contractAddress)]);
  const best = pairs[0];
  const bid = num((rhj as { bid?: string } | null)?.bid);
  const ask = num((rhj as { ask?: string } | null)?.ask);
  const mid = bid != null && ask != null ? (bid + ask) / 2 : null;
  const dex = num(best?.priceUsd);
  return {
    ok: true,
    asset,
    rhj,
    dex: best ? tokenFromPair(best) : null,
    premiumBps: mid && dex ? Math.round(((dex - mid) / mid) * 10_000) : null,
    disclaimer:
      "Stock Tokens are tokenised debt securities issued by Robinhood Assets (Jersey) Ltd and may not be offered to US/Canada/UK/Switzerland persons.",
  };
}

export async function verifyToken(ticker: string, address?: string) {
  const assets = await loadStockAssets();
  const canonical = assets.find((a) => a.tokenSymbol.toLowerCase() === ticker.trim().toLowerCase());
  const pairs = await searchDex(ticker);
  const others = [
    ...new Set(
      pairs
        .map((p) => (p.baseToken?.address || "").toLowerCase())
        .filter((a) => a && a !== (canonical?.contractAddress || "").toLowerCase()),
    ),
  ];
  const provided = address?.trim();
  const match = provided
    ? canonical
      ? canonical.contractAddress.toLowerCase() === provided.toLowerCase()
      : false
    : null;
  return {
    ticker: ticker.toUpperCase(),
    canonical: canonical || null,
    provided: provided || null,
    isCanonical: match,
    lookalikes: others.slice(0, 12),
    warning: others.length
      ? `${others.length} other Robinhood Chain token(s) trade under ticker ${ticker.toUpperCase()}. Always resolve by contract.`
      : "No ticker collisions found in DexScreener search.",
  };
}

export async function getSwapQuote(params: {
  fromToken: string;
  toToken: string;
  amount: string;
}) {
  const [fromPairs, toPairs] = await Promise.all([
    isAddress(params.fromToken) ? tokenPairs(params.fromToken) : searchDex(params.fromToken),
    isAddress(params.toToken) ? tokenPairs(params.toToken) : searchDex(params.toToken),
  ]);
  const from = fromPairs[0];
  const to = toPairs[0];
  if (!from || !to) return { ok: false, error: "Could not resolve both tokens on Robinhood Chain." };
  const fromPx = num(from.priceUsd);
  const toPx = num(to.priceUsd);
  const amt = Number(params.amount);
  if (!fromPx || !toPx || !Number.isFinite(amt) || amt <= 0) {
    return { ok: false, error: "Need live USD prices and a positive amount." };
  }
  const usd = amt * fromPx;
  const out = usd / toPx;
  return {
    ok: true,
    readOnly: true,
    from: tokenFromPair(from),
    to: tokenFromPair(to),
    amountIn: amt,
    amountOutEst: out,
    usdValue: usd,
    note: "Indicative mid from DexScreener USD prices. Not a routed Uniswap quote and not executable. No wallet is required.",
  };
}

export async function getChart(query: string, timeframe = "minute", aggregate = 5) {
  const pairs = isAddress(query) ? await tokenPairs(query) : await searchDex(query);
  const pool = pairs[0]?.pairAddress;
  if (!pool) return { ok: false, error: `No pool for ${query}` };
  const bars = await ohlcv(pool, timeframe, aggregate, 180);
  return {
    ok: true,
    query,
    pool,
    pair: tokenFromPair(pairs[0]),
    timeframe,
    aggregate,
    bars,
  };
}

export const toolImpl = {
  search_token: (args: Record<string, unknown>) => searchToken(String(args.query || args.q || "")),
  scan_token: (args: Record<string, unknown>) => scanToken(String(args.query || args.address || args.mint || "")),
  get_token: (args: Record<string, unknown>) => getToken(String(args.address || args.query || "")),
  get_chart: (args: Record<string, unknown>) =>
    getChart(String(args.query || args.pool || args.address || ""), String(args.timeframe || "minute"), Number(args.aggregate || 5) || 5),
  get_desk: () => getDesk(),
  list_trending: (args: Record<string, unknown>) => trendingPools(String(args.duration || "1h")),
  list_launches: async (args: Record<string, unknown>) => {
    const [pons, gecko] = await Promise.all([
      listPonsLaunches({
        limit: Number(args.limit || 24),
        lookback: args.lookback ? Number(args.lookback) : 8_000,
        generation: args.generation ? String(args.generation) : "all",
      }).catch((error) => ({ ok: false, error: String(error), launches: [] })),
      newPools().catch(() => []),
    ]);
    return { ...pons, gecko };
  },
  list_pons_launches: (args: Record<string, unknown>) =>
    listPonsLaunches({
      limit: Number(args.limit || 24),
      lookback: args.lookback ? Number(args.lookback) : 8_000,
      generation: args.generation ? String(args.generation) : "all",
    }),
  get_pons_token: (args: Record<string, unknown>) => getPonsToken(String(args.address || args.token || args.query || "")),
  get_pons_graduation: (args: Record<string, unknown>) =>
    getPonsGraduation(String(args.address || args.token || args.query || "")),
  get_pons_protocol: () => getPonsProtocol(),
  list_top_pools: () => topPools(),
  list_stock_tokens: async (args: Record<string, unknown>) => {
    const all = await loadStockAssets();
    const q = String(args.query || "").trim().toLowerCase();
    return q ? all.filter((a) => a.tokenSymbol.toLowerCase().includes(q) || a.tokenName.toLowerCase().includes(q)) : all;
  },
  get_stock_quote: (args: Record<string, unknown>) => getStockQuoteTool(String(args.symbol || args.ticker || "")),
  get_holders: (args: Record<string, unknown>) => getHolderProxy(String(args.address || args.query || "")),
  get_token_activity: (args: Record<string, unknown>) =>
    getTokenActivity(String(args.query || args.address || args.token || "")),
  get_wallet: (args: Record<string, unknown>) => getWallet(String(args.address || "")),
  get_chain_stats: () => getChainStats(),
  get_transaction: (args: Record<string, unknown>) => getTransaction(String(args.hash || args.tx || "")),
  get_safety: (args: Record<string, unknown>) => scanToken(String(args.query || args.address || "")),
  verify_token: (args: Record<string, unknown>) =>
    verifyToken(String(args.ticker || args.symbol || ""), args.address ? String(args.address) : undefined),
  get_swap_quote: (args: Record<string, unknown>) =>
    getSwapQuote({
      fromToken: String(args.fromToken || args.from || ""),
      toToken: String(args.toToken || args.to || ""),
      amount: String(args.amount || "1"),
    }),
  get_pair: async (args: Record<string, unknown>) => {
    const addr = String(args.pair || args.address || "");
    const pair = await pairByAddress(addr);
    return pair ? { ok: true, pair: tokenFromPair(pair) } : { ok: false, error: "Pair not found on Robinhood Chain." };
  },
  get_corporate_actions: (args: Record<string, unknown>) => corporateActions(Number(args.limit || 25)),
  get_wallet_txs: (args: Record<string, unknown>) =>
    getWalletTxs(String(args.address || ""), Number(args.page || 1), Number(args.offset || args.limit || 40)),
  get_wallet_tokens: (args: Record<string, unknown>) => getWalletTokens(String(args.address || "")),
  get_wallet_pnl: (args: Record<string, unknown>) => getWalletPnl(String(args.address || "")),
  track_wallet: (args: Record<string, unknown>) => trackWallet(String(args.address || "")),
  get_wallet_flow: (args: Record<string, unknown>) => getWalletFlow(String(args.address || "")),
  get_token_analytics: (args: Record<string, unknown>) =>
    getTokenAnalytics(String(args.query || args.address || args.symbol || ""), String(args.window || args.duration || "24h")),
  get_volume_profile: (args: Record<string, unknown>) =>
    getTokenAnalytics(String(args.query || args.address || ""), String(args.window || "24h")),
  get_top_traders: (args: Record<string, unknown>) => getTopTraders(String(args.query || args.address || "")),
  get_smart_money: (args: Record<string, unknown>) => getSmartMoney(String(args.query || args.address || "")),
  get_first_buyers: (args: Record<string, unknown>) => getFirstBuyers(String(args.query || args.address || "")),
  get_dev_activity: (args: Record<string, unknown>) => getFirstBuyers(String(args.query || args.address || "")),
  list_boosted: () => boostedTokens(),
  get_gas_oracle: () => getGasOracle(),
  get_block: (args: Record<string, unknown>) => getBlockTool(args.id ? String(args.id) : undefined),
  get_contract: (args: Record<string, unknown>) => getContractMeta(String(args.address || "")),
  compare_tokens: (args: Record<string, unknown>) =>
    compareTokens(String(args.a || args.left || ""), String(args.b || args.right || "NVDA")),
  get_market_overview: () => getMarketOverview(),
  preview_pons_launch: (args: Record<string, unknown>) =>
    previewPonsLaunch({
      name: String(args.name || "Token"),
      symbol: String(args.symbol || "TOKEN"),
      launchConfigId: args.launchConfigId ? Number(args.launchConfigId) : 0,
    }),
  prepare_pons_launch: (args: Record<string, unknown>) =>
    preparePonsLaunch({
      name: String(args.name || ""),
      symbol: String(args.symbol || ""),
      description: args.description ? String(args.description) : undefined,
      logo: args.logo ? String(args.logo) : undefined,
      twitter: args.twitter ? String(args.twitter) : undefined,
      telegram: args.telegram ? String(args.telegram) : undefined,
      website: args.website ? String(args.website) : undefined,
      creatorFeeRecipient: args.creatorFeeRecipient ? String(args.creatorFeeRecipient) : undefined,
      creatorTaxBps: args.creatorTaxBps != null ? Number(args.creatorTaxBps) : undefined,
      buybackEnabled: args.buybackEnabled == null ? true : Boolean(args.buybackEnabled),
      launchConfigId: args.launchConfigId != null ? Number(args.launchConfigId) : 0,
    }),
  prepare_pons_buy: (args: Record<string, unknown>) =>
    preparePonsBuy(String(args.address || args.token || ""), args.ethAmount ? String(args.ethAmount) : undefined),
  get_curve_quote: (args: Record<string, unknown>) => getCurveQuote(String(args.address || args.token || "")),
  add_robinhood_chain: async () => ({ ok: true, method: "wallet_addEthereumChain", params: [addRobinhoodChainParams] }),
  get_mcp_info: () => getMcpInfo(),
  apogee_status: async () => {
    const stats = await getChainStats();
    return {
      ok: true,
      product: "Apogee MCP",
      version: "2.0.0",
      auth: "none",
      url: mcpHttpUrl(),
      tools: { listed: Object.keys(toolImpl).length, catalog: CATALOG_SIZE },
      pons: { app: PONS.app, docs: PONS.docs },
      ...stats,
    };
  },
};

export type ToolName = keyof typeof toolImpl;
