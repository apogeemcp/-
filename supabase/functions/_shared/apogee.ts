export const CHAIN_ID = 4663;
export const SLUG = "robinhood";
export const RPC = Deno.env.get("APOGEE_RPC_URL") || "https://rpc.mainnet.chain.robinhood.com";
export const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
export const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
export const DEX = "https://api.dexscreener.com";
export const GECKO = "https://api.geckoterminal.com/api/v2";
export const RHJ = "https://api.robinhood.com/rhj";
export const LLAMA = "https://api.llama.fi";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, apikey, content-type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "mcp-protocol-version": "2025-03-26" },
  });

export async function fetchJson<T>(url: string, init: RequestInit = {}, ms = 12000): Promise<T | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal, headers: { accept: "application/json", ...(init.headers || {}) } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.result as T;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
export const isAddress = (v: string) => ADDRESS_RE.test(v.trim());

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function rhPairs(pairs: any[] | null | undefined) {
  return (pairs || []).filter((p) => String(p.chainId || "").toLowerCase() === SLUG)
    .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
}

type Asset = { tokenSymbol: string; tokenName: string; contractAddress: string; currentMultiplier: string; logoUrl: string | null; status: string };
let assetCache: { at: number; value: Asset[] } | null = null;

export async function loadAssets(): Promise<Asset[]> {
  if (assetCache && Date.now() - assetCache.at < 10 * 60_000) return assetCache.value;
  const data = await fetchJson<{ assets?: any[] }>(`${RHJ}/assets`);
  const out: Asset[] = [];
  for (const a of data?.assets || []) {
    const dep = (a.deployments || []).find((d: any) => d.chainId === CHAIN_ID) || a.deployments?.[0];
    if (!dep?.contractAddress) continue;
    out.push({
      tokenSymbol: a.tokenSymbol,
      tokenName: a.tokenName,
      contractAddress: dep.contractAddress,
      currentMultiplier: a.currentMultiplier || "1",
      logoUrl: a.logoUrl || null,
      status: a.status || "",
    });
  }
  assetCache = { at: Date.now(), value: out };
  return out;
}

async function searchDex(q: string) {
  const data = await fetchJson<{ pairs?: any[] }>(`${DEX}/latest/dex/search?q=${encodeURIComponent(q)}`);
  return rhPairs(data?.pairs);
}

async function tokenPairs(address: string) {
  const data = await fetchJson<{ pairs?: any[] }>(`${DEX}/latest/dex/tokens/${address}`);
  return rhPairs(data?.pairs);
}

async function stockQuote(symbol: string) {
  const data = await fetchJson<{ quotes?: any[] }>(`${RHJ}/prices/${encodeURIComponent(symbol)}`);
  return data?.quotes?.[0] || null;
}

function gecko(data: any[] | undefined) {
  return (data || []).map((row) => {
    const a = row.attributes || {};
    const pc = a.price_change_percentage || {};
    return {
      address: a.address,
      name: a.name,
      priceUsd: num(a.base_token_price_usd),
      fdvUsd: num(a.fdv_usd),
      createdAt: a.pool_created_at,
      volume24h: num(a.volume_usd?.h24),
      change1h: num(pc.h1),
      change24h: num(pc.h24),
      reserveUsd: num(a.reserve_in_usd),
    };
  });
}

function fromPair(p: any) {
  return {
    address: p.baseToken?.address,
    name: p.baseToken?.name,
    symbol: p.baseToken?.symbol,
    pairAddress: p.pairAddress,
    dexId: p.dexId,
    priceUsd: num(p.priceUsd),
    liquidityUsd: p.liquidity?.usd ?? null,
    volume24h: p.volume?.h24 ?? null,
    marketCap: p.marketCap || p.fdv || null,
    priceChange: p.priceChange || null,
    createdAt: p.pairCreatedAt || null,
    url: p.url,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function scoreScan(input: {
  canonical: boolean;
  collisions: number;
  liq: number;
  mcap: number;
  ageDays: number | null;
  premiumBps: number | null;
}) {
  const authenticity = input.canonical ? 100 : clamp(55 - (input.collisions > 1 ? 30 : 0) + (input.liq > 250000 ? 15 : 0), 0, 100);
  const ath = input.mcap >= 1e9 ? 100 : input.mcap >= 1e7 ? 55 : input.mcap >= 1e6 ? 35 : 12;
  const age = input.ageDays == null ? 20 : input.ageDays >= 90 ? 68 : input.ageDays >= 7 ? 35 : 14;
  let total = Math.round(authenticity * 0.4 + ath * 0.25 + age * 0.2 + (input.liq > 1000 ? 70 : 20) * 0.15);
  const lookalike = !input.canonical && input.collisions > 1;
  if (lookalike) total -= 18;
  if (input.liq < 1000) total -= 12;
  total = clamp(total, 0, 100);
  const verdict = input.canonical
    ? "CANONICAL STOCK TOKEN"
    : lookalike
    ? "CAUTION — ticker collides with a canonical Stock Token"
    : total >= 80
    ? "STRONG"
    : total >= 60
    ? "LIKELY REAL"
    : total >= 40
    ? "MIXED — verify the contract before size"
    : "WEAK / LIKELY LOOKALIKE";
  return { total, verdict, lookalike };
}

export async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "search_token": {
      const q = String(args.query || args.q || "").trim();
      const [assets, pairs] = await Promise.all([loadAssets(), searchDex(q)]);
      const ql = q.toLowerCase();
      const stocks = assets.filter((a) =>
        isAddress(q) ? a.contractAddress.toLowerCase() === ql : a.tokenSymbol.toLowerCase().includes(ql) || a.tokenName.toLowerCase().includes(ql),
      );
      return { query: q, stocks: stocks.slice(0, 12), pairs: rhPairs(pairs).slice(0, 20).map(fromPair) };
    }
    case "scan_token":
    case "get_safety": {
      const q = String(args.query || args.address || "").trim();
      const assets = await loadAssets();
      let pairs = isAddress(q) ? await tokenPairs(q) : await searchDex(q);
      if (!pairs.length) {
        const stock = assets.find((a) => a.tokenSymbol.toLowerCase() === q.toLowerCase());
        if (stock) pairs = await tokenPairs(stock.contractAddress);
      }
      const best = pairs[0];
      if (!best?.baseToken?.address) return { ok: false, error: `No Robinhood Chain market found for "${q}".` };
      const address = best.baseToken.address as string;
      const symbol = best.baseToken.symbol || "";
      const canonical = assets.find((a) => a.contractAddress.toLowerCase() === address.toLowerCase());
      const unique = new Set(pairs.map((p) => String(p.baseToken?.address || "").toLowerCase()).filter(Boolean));
      const rhj = canonical ? await stockQuote(canonical.tokenSymbol) : await stockQuote(symbol);
      const bid = num(rhj?.bid);
      const ask = num(rhj?.ask);
      const mid = bid != null && ask != null ? (bid + ask) / 2 : bid ?? ask;
      const dexPrice = num(best.priceUsd);
      const premiumBps = mid && dexPrice ? Math.round(((dexPrice - mid) / mid) * 10000) : null;
      const ageDays = best.pairCreatedAt ? Math.max(0, Math.round((Date.now() - best.pairCreatedAt) / 86400000)) : null;
      const scored = scoreScan({
        canonical: Boolean(canonical),
        collisions: Math.max(unique.size, 1),
        liq: best.liquidity?.usd || 0,
        mcap: best.marketCap || best.fdv || 0,
        ageDays,
        premiumBps,
      });
      logScan({
        address,
        symbol,
        name: best.baseToken?.name,
        score: scored.total,
        verdict: scored.verdict,
        price_usd: dexPrice,
        liquidity_usd: best.liquidity?.usd,
      });
      return {
        ok: true,
        query: q,
        token: {
          ...fromPair(best),
          canonicalStock: Boolean(canonical),
          multiplier: canonical?.currentMultiplier || null,
          rhjQuote: rhj,
          dexPremiumBps: premiumBps,
          ageDays,
        },
        score: { total: scored.total, verdict: scored.verdict },
        flags: { tickerCollision: unique.size > 1, canonicalStock: Boolean(canonical), unverifiedLookalike: scored.lookalike },
        verdict: scored.verdict,
      };
    }
    case "get_token": {
      const q = String(args.address || args.query || "");
      const scan = await runTool("scan_token", { query: q }) as any;
      if (!scan?.ok) return scan;
      const pairs = await tokenPairs(scan.token.address);
      return { ...scan, markets: pairs.slice(0, 12).map(fromPair) };
    }
    case "get_chart": {
      const q = String(args.query || args.pool || args.address || "");
      const tf = String(args.timeframe || "minute");
      const agg = Number(args.aggregate || 5);
      const pairs = isAddress(q) ? await tokenPairs(q) : await searchDex(q);
      const pool = pairs[0]?.pairAddress;
      if (!pool) return { ok: false, error: `No pool for ${q}` };
      const data = await fetchJson<any>(
        `${GECKO}/networks/${SLUG}/pools/${pool}/ohlcv/${tf}?aggregate=${agg}&limit=180&currency=usd`,
        { headers: { accept: "application/json;version=20230302" } },
      );
      const rows = data?.data?.attributes?.ohlcv_list || [];
      return {
        ok: true,
        pool,
        pair: fromPair(pairs[0]),
        bars: rows.slice().reverse().map((r: number[]) => ({ time: r[0], open: r[1], high: r[2], low: r[3], close: r[4], volume: r[5] })),
      };
    }
    case "get_desk": {
      const [trend, launches, assets, llama, blockHex] = await Promise.all([
        fetchJson<any>(`${GECKO}/networks/${SLUG}/trending_pools?duration=1h`, { headers: { accept: "application/json;version=20230302" } }),
        fetchJson<any>(`${GECKO}/networks/${SLUG}/new_pools?page=1`, { headers: { accept: "application/json;version=20230302" } }),
        loadAssets(),
        fetchJson<any[]>(`${LLAMA}/v2/chains`),
        rpc<string>("eth_blockNumber").catch(() => "0x0"),
      ]);
      const tvl = (llama || []).find((c) => c.chainId === CHAIN_ID)?.tvl ?? null;
      const featured = ["NVDA", "AAPL", "TSLA", "SPY", "MSTR", "AMZN"];
      const stocks = [];
      for (const sym of featured) {
        const asset = assets.find((a) => a.tokenSymbol === sym);
        const [rhj, pairs] = await Promise.all([stockQuote(sym), asset ? tokenPairs(asset.contractAddress) : Promise.resolve([])]);
        const best = pairs[0];
        const bid = num(rhj?.bid);
        const ask = num(rhj?.ask);
        const mid = bid != null && ask != null ? (bid + ask) / 2 : null;
        const dex = num(best?.priceUsd);
        stocks.push({
          symbol: sym,
          address: asset?.contractAddress || null,
          mid,
          dexPrice: dex,
          premiumBps: mid && dex ? Math.round(((dex - mid) / mid) * 10000) : null,
          liquidity: best?.liquidity?.usd ?? null,
        });
      }
      return {
        chain: { id: CHAIN_ID, name: "Robinhood Chain", block: Number(BigInt(blockHex || "0x0")), tvlUsd: tvl, stockTokens: assets.length },
        trending: gecko(trend?.data).slice(0, 12),
        launches: gecko(launches?.data).slice(0, 12),
        stocks,
      };
    }
    case "list_trending": {
      const duration = String(args.duration || "1h");
      const data = await fetchJson<any>(`${GECKO}/networks/${SLUG}/trending_pools?duration=${duration}`, { headers: { accept: "application/json;version=20230302" } });
      return gecko(data?.data);
    }
    case "list_launches": {
      const data = await fetchJson<any>(`${GECKO}/networks/${SLUG}/new_pools?page=1`, { headers: { accept: "application/json;version=20230302" } });
      return gecko(data?.data);
    }
    case "list_top_pools": {
      const data = await fetchJson<any>(`${GECKO}/networks/${SLUG}/pools?page=1`, { headers: { accept: "application/json;version=20230302" } });
      return gecko(data?.data);
    }
    case "list_stock_tokens": {
      const all = await loadAssets();
      const q = String(args.query || "").toLowerCase();
      return q ? all.filter((a) => a.tokenSymbol.toLowerCase().includes(q) || a.tokenName.toLowerCase().includes(q)) : all;
    }
    case "get_stock_quote": {
      const symbol = String(args.symbol || args.ticker || "");
      const assets = await loadAssets();
      const asset = assets.find((a) => a.tokenSymbol.toLowerCase() === symbol.toLowerCase());
      if (!asset) return { ok: false, error: `No canonical Stock Token named ${symbol}.` };
      const [rhj, pairs] = await Promise.all([stockQuote(asset.tokenSymbol), tokenPairs(asset.contractAddress)]);
      const best = pairs[0];
      const bid = num(rhj?.bid);
      const ask = num(rhj?.ask);
      const mid = bid != null && ask != null ? (bid + ask) / 2 : null;
      const dex = num(best?.priceUsd);
      return {
        ok: true,
        asset,
        rhj,
        dex: best ? fromPair(best) : null,
        premiumBps: mid && dex ? Math.round(((dex - mid) / mid) * 10000) : null,
        disclaimer: "Stock Tokens may not be offered to US/Canada/UK/Switzerland persons.",
      };
    }
    case "get_holders": {
      const address = String(args.address || "");
      if (!isAddress(address)) return { ok: false, error: "Provide a token address." };
      const pairs = await tokenPairs(address);
      return { ok: true, address, note: "Holder lists are explorer-gated; returning DexScreener markets.", markets: pairs.slice(0, 8).map(fromPair) };
    }
    case "get_wallet": {
      const address = String(args.address || "");
      if (!isAddress(address)) return { ok: false, error: "Provide a 0x address." };
      const eth = await rpc<string>("eth_getBalance", [address, "latest"]);
      return { ok: true, address, native: { symbol: "ETH", raw: BigInt(eth).toString() }, note: "Read-only." };
    }
    case "get_chain_stats": {
      const [blockHex, gasHex, llama, assets] = await Promise.all([
        rpc<string>("eth_blockNumber"),
        rpc<string>("eth_gasPrice"),
        fetchJson<any[]>(`${LLAMA}/v2/chains`),
        loadAssets(),
      ]);
      const tvl = (llama || []).find((c) => c.chainId === CHAIN_ID)?.tvl ?? null;
      return {
        chainId: CHAIN_ID,
        block: Number(BigInt(blockHex)),
        gasPriceWei: BigInt(gasHex).toString(),
        tvlUsd: tvl,
        stockTokenCount: assets.length,
        rpc: RPC,
        canonical: { WETH, USDG },
      };
    }
    case "get_transaction": {
      const hash = String(args.hash || args.tx || "");
      const [tx, receipt] = await Promise.all([
        rpc("eth_getTransactionByHash", [hash]),
        rpc("eth_getTransactionReceipt", [hash]).catch(() => null),
      ]);
      return { transaction: tx, receipt };
    }
    case "verify_token": {
      const ticker = String(args.ticker || args.symbol || "");
      const provided = args.address ? String(args.address) : null;
      const assets = await loadAssets();
      const canonical = assets.find((a) => a.tokenSymbol.toLowerCase() === ticker.toLowerCase()) || null;
      const pairs = await searchDex(ticker);
      const others = [...new Set(pairs.map((p) => String(p.baseToken?.address || "").toLowerCase()).filter((a) => a && a !== canonical?.contractAddress.toLowerCase()))];
      return {
        ticker: ticker.toUpperCase(),
        canonical,
        provided,
        isCanonical: provided && canonical ? canonical.contractAddress.toLowerCase() === provided.toLowerCase() : null,
        lookalikes: others.slice(0, 12),
      };
    }
    case "get_swap_quote": {
      const fromToken = String(args.fromToken || args.from || "");
      const toToken = String(args.toToken || args.to || "");
      const amt = Number(args.amount || "1");
      const [fromPairs, toPairs] = await Promise.all([
        isAddress(fromToken) ? tokenPairs(fromToken) : searchDex(fromToken),
        isAddress(toToken) ? tokenPairs(toToken) : searchDex(toToken),
      ]);
      const from = fromPairs[0];
      const to = toPairs[0];
      if (!from || !to) return { ok: false, error: "Could not resolve both tokens." };
      const fromPx = num(from.priceUsd);
      const toPx = num(to.priceUsd);
      if (!fromPx || !toPx || !Number.isFinite(amt)) return { ok: false, error: "Need live USD prices." };
      return { ok: true, readOnly: true, amountIn: amt, amountOutEst: (amt * fromPx) / toPx, usdValue: amt * fromPx, from: fromPair(from), to: fromPair(to) };
    }
    case "get_pair": {
      const addr = String(args.pair || args.address || "");
      const data = await fetchJson<any>(`${DEX}/latest/dex/pairs/${SLUG}/${addr}`);
      const pair = data?.pair || data?.pairs?.[0];
      return pair ? { ok: true, pair: fromPair(pair) } : { ok: false, error: "Pair not found." };
    }
    case "get_corporate_actions": {
      const data = await fetchJson<{ corpActions?: unknown[] }>(`${RHJ}/corporate-actions`);
      return (data?.corpActions || []).slice(0, Number(args.limit || 25));
    }
    case "apogee_status":
      return { ok: true, product: "Apogee MCP", version: "1.0.0", auth: "none", chainId: CHAIN_ID, slug: SLUG };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function logScan(row: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  const work = fetch(`${url}/rest/v1/apogee_scan_log`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  }).catch(() => {});
  // @ts-ignore edge
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(work);
}

export function logUsage(tool: string, query: string | undefined, ok: boolean) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  const work = fetch(`${url}/rest/v1/apogee_usage`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ tool, query: query || null, ok }),
  }).catch(() => {});
  // @ts-ignore edge
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(work);
}

export const TOOLS = [
  ["search_token", "Search Robinhood Chain tokens, pools, and canonical Stock Tokens."],
  ["scan_token", "OG-style Apogee scan with composite score, collisions, DEX vs RHJ premium."],
  ["get_token", "Full token intel plus markets."],
  ["get_chart", "OHLCV candles for the deepest pool."],
  ["get_desk", "Chain stats, trending, launches, featured stock quotes."],
  ["list_trending", "Trending pools."],
  ["list_launches", "Newest pools."],
  ["list_top_pools", "Top pools."],
  ["list_stock_tokens", "Canonical Stock Token registry."],
  ["get_stock_quote", "RHJ bid/ask vs DEX premium."],
  ["get_holders", "Market/holder proxy via pools."],
  ["get_wallet", "Read-only ETH balance."],
  ["get_chain_stats", "Height, gas, TVL."],
  ["get_transaction", "Tx + receipt."],
  ["get_safety", "Safety pass (scan engine)."],
  ["verify_token", "Canonical ticker vs lookalikes."],
  ["get_swap_quote", "Read-only indicative USD swap."],
  ["get_pair", "Specific pool."],
  ["get_corporate_actions", "RHJ corporate actions."],
  ["apogee_status", "Health check. No auth."],
].map(([name, description]) => ({
  name,
  description,
  inputSchema: { type: "object", properties: { query: { type: "string" }, address: { type: "string" }, symbol: { type: "string" } } },
}));
