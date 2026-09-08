import { CHAIN, ENDPOINTS, TOKENS, isAddress, explorerAddress, explorerTx, explorerToken } from "./chain";
import { fetchJson, nativeBalance, erc20Balance, erc20Meta, formatUnits, latestBlock, gasPriceWei } from "./rpc";

type DsPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  priceUsd?: string;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?: Record<string, { buys?: number; sells?: number }>;
  baseToken?: { address?: string; name?: string; symbol?: string };
};

function rhPairs(pairs: DsPair[] | null | undefined): DsPair[] {
  return (pairs || [])
    .filter((p) => (p.chainId || "").toLowerCase() === CHAIN.slug)
    .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
}

async function searchDex(query: string): Promise<DsPair[]> {
  const res = await fetchJson<{ pairs?: DsPair[] }>(`${ENDPOINTS.dex}/latest/dex/search?q=${encodeURIComponent(query)}`);
  return rhPairs(res.data?.pairs);
}

async function tokenPairs(address: string): Promise<DsPair[]> {
  const res = await fetchJson<{ pairs?: DsPair[] }>(`${ENDPOINTS.dex}/latest/dex/tokens/${address}`);
  return rhPairs(res.data?.pairs);
}

async function loadWatchTokens(): Promise<string[]> {
  const res = await fetchJson<{ assets?: Array<Record<string, unknown>> }>(`${ENDPOINTS.rhj}/assets`);
  const out: string[] = [TOKENS.USDG, TOKENS.WETH];
  for (const a of res.data?.assets || []) {
    const deps = (a.deployments as Array<Record<string, unknown>> | undefined) || [];
    const dep = deps.find((d) => Number(d.chainId) === CHAIN.id) || deps[0];
    if (dep?.contractAddress) out.push(String(dep.contractAddress));
    if (out.length >= 28) break;
  }
  return [...new Set(out.map((x) => x.toLowerCase()))];
}

const UA = { accept: "application/json", "user-agent": "ApogeeMCP/2.0 (+https://apogeemcp.digital)" };

type ExplorerTx = {
  hash?: string;
  from?: string;
  to?: string;
  value?: string;
  timeStamp?: string;
  gasUsed?: string;
  gasPrice?: string;
  isError?: string;
  functionName?: string;
  input?: string;
  contractAddress?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
  tokenName?: string;
};

async function explorer<T>(params: Record<string, string>): Promise<T | null> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetchJson<{ status?: string; message?: string; result?: T }>(`${CHAIN.explorer}/api?${qs}`, {
    headers: UA,
  });
  if (!res.ok) return null;
  return (res.data?.result as T) ?? null;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function pairUsd(p: DsPair | undefined): number | null {
  return p ? num(p.priceUsd) : null;
}

export async function getWalletTxs(address: string, page = 1, offset = 40) {
  if (!isAddress(address)) return { ok: false, error: "Provide a 0x wallet." };
  const [native, tokens] = await Promise.all([
    explorer<ExplorerTx[]>({
      module: "account",
      action: "txlist",
      address,
      sort: "desc",
      page: String(page),
      offset: String(offset),
    }),
    explorer<ExplorerTx[]>({
      module: "account",
      action: "tokentx",
      address,
      sort: "desc",
      page: String(page),
      offset: String(offset),
    }),
  ]);
  const mapTx = (t: ExplorerTx, kind: "eth" | "erc20") => ({
    kind,
    hash: t.hash,
    from: t.from,
    to: t.to,
    value: t.value,
    symbol: kind === "eth" ? "ETH" : t.tokenSymbol,
    token: t.contractAddress || null,
    timestamp: t.timeStamp ? Number(t.timeStamp) : null,
    failed: t.isError === "1",
    explorer: t.hash ? explorerTx(t.hash) : null,
  });
  return {
    ok: true,
    address,
    explorer: explorerAddress(address),
    native: (native || []).map((t) => mapTx(t, "eth")),
    tokens: (tokens || []).map((t) => mapTx(t, "erc20")),
  };
}

export async function getWalletTokens(address: string) {
  if (!isAddress(address)) return { ok: false, error: "Provide a 0x wallet." };
  const watch = await loadWatchTokens();
  const [eth, rows] = await Promise.all([
    nativeBalance(address),
    Promise.all(
      watch.map(async (token) => {
        const [bal, meta] = await Promise.all([erc20Balance(token, address).catch(() => 0n), erc20Meta(token).catch(() => ({ symbol: null, name: null, decimals: 18, totalSupply: null }))]);
        return {
          token,
          symbol: meta.symbol,
          name: meta.name,
          decimals: meta.decimals ?? 18,
          raw: bal.toString(),
          formatted: formatUnits(bal, meta.decimals ?? 18),
          explorer: explorerToken(token),
        };
      }),
    ),
  ]);
  return {
    ok: true,
    address,
    explorer: explorerAddress(address),
    native: { symbol: "ETH", raw: eth.toString(), formatted: formatUnits(eth, 18) },
    tokens: rows.filter((t) => t.raw !== "0"),
  };
}

export async function getWalletPnl(address: string) {
  const [holdings, txs] = await Promise.all([getWalletTokens(address), getWalletTxs(address, 1, 80)]);
  if (!holdings.ok) return holdings;
  const prices = await Promise.all(
    (holdings.tokens || []).slice(0, 16).map(async (t) => {
      const pairs = await tokenPairs(t.token).catch(() => []);
      return { token: t.token, usd: pairUsd(pairs[0]), symbol: t.symbol, formatted: t.formatted };
    }),
  );
  const positions = prices.map((p) => {
    const amt = Number(p.formatted);
    const usd = p.usd && Number.isFinite(amt) ? amt * p.usd : null;
    return { ...p, usd };
  });
  const ethPairs = await searchDex("WETH").catch(() => []);
  const ethUsd = pairUsd(ethPairs[0]);
  const ethAmt = Number(holdings.native?.formatted || 0);
  const nativeUsd = ethUsd && Number.isFinite(ethAmt) ? ethAmt * ethUsd : null;
  const tokenUsd = positions.reduce((s, p) => s + (p.usd || 0), 0);
  return {
    ok: true,
    address,
    explorer: explorerAddress(address),
    nativeUsd,
    tokenUsd,
    equityUsd: (nativeUsd || 0) + tokenUsd,
    positions,
    recent: "ok" in txs && txs.ok ? [...(txs.native || []), ...(txs.tokens || [])].slice(0, 24) : [],
    note: "PnL is mark-to-market from DexScreener USD prices plus explorer transfers. Cost basis is not recovered when Blockscout history is truncated.",
  };
}

export async function trackWallet(address: string) {
  const [pnl, stats] = await Promise.all([getWalletPnl(address), latestBlock().catch(() => ({ number: 0, timestamp: null }))]);
  return { ...pnl, chainBlock: stats.number, trackedAt: Date.now() };
}

export async function getWalletFlow(address: string) {
  const txs = await getWalletTxs(address, 1, 100);
  if (!txs.ok) return txs;
  const addr = address.toLowerCase();
  const inflows = (txs.tokens || []).filter((t) => (t.to || "").toLowerCase() === addr).length;
  const outflows = (txs.tokens || []).filter((t) => (t.from || "").toLowerCase() === addr).length;
  const counterparties = new Set(
    [...(txs.native || []), ...(txs.tokens || [])]
      .flatMap((t) => [t.from, t.to])
      .filter((x): x is string => typeof x === "string" && x.toLowerCase() !== addr),
  );
  return {
    ok: true,
    address,
    tokenIn: inflows,
    tokenOut: outflows,
    counterparties: [...counterparties].slice(0, 40),
    counterpartyCount: counterparties.size,
  };
}

export async function getTokenAnalytics(query: string, window = "24h") {
  const pairs = await (query.match(/^0x[a-fA-F0-9]{40}$/) ? tokenPairs(query) : searchDex(query));
  const p = pairs[0];
  if (!p) return { ok: false, error: `No Robinhood Chain market for ${query}` };
  const vol =
    window === "5m" || window === "1m"
      ? p.volume?.m5
      : window === "1h"
        ? p.volume?.h1
        : window === "6h"
          ? p.volume?.h6
          : p.volume?.h24;
  const change =
    window === "5m" || window === "1m"
      ? p.priceChange?.m5
      : window === "1h"
        ? p.priceChange?.h1
        : window === "6h"
          ? p.priceChange?.h6
          : p.priceChange?.h24;
  const tx =
    window === "5m" || window === "1m"
      ? p.txns?.m5
      : window === "1h"
        ? p.txns?.h1
        : window === "6h"
          ? p.txns?.h6
          : p.txns?.h24;
  return {
    ok: true,
    query,
    window,
    token: p.baseToken,
    pair: p.pairAddress,
    priceUsd: num(p.priceUsd),
    liquidityUsd: p.liquidity?.usd ?? null,
    fdv: p.fdv ?? null,
    volume: vol ?? null,
    changePct: change ?? null,
    txns: tx ?? null,
    buys: tx?.buys ?? null,
    sells: tx?.sells ?? null,
    buySellRatio: tx?.buys && tx?.sells ? tx.buys / Math.max(1, tx.sells) : null,
    dex: p.dexId,
    url: p.url,
  };
}

export async function getTopTraders(query: string) {
  const pairs = await (query.match(/^0x[a-fA-F0-9]{40}$/) ? tokenPairs(query) : searchDex(query));
  const p = pairs[0];
  if (!p?.baseToken?.address) return { ok: false, error: `No market for ${query}` };
  const transfers = await explorer<ExplorerTx[]>({
    module: "account",
    action: "tokentx",
    address: p.baseToken.address,
    sort: "desc",
    page: "1",
    offset: "80",
  });
  const counts = new Map<string, { buys: number; sells: number; volume: number }>();
  const token = p.baseToken.address.toLowerCase();
  for (const t of transfers || []) {
    const dec = Number(t.tokenDecimal || 18);
    const amt = Number(t.value || 0) / 10 ** (Number.isFinite(dec) ? dec : 18);
    const add = (addr: string, side: "buys" | "sells") => {
      const a = addr.toLowerCase();
      if (!a || a === token) return;
      const cur = counts.get(a) || { buys: 0, sells: 0, volume: 0 };
      cur[side] += 1;
      cur.volume += Number.isFinite(amt) ? amt : 0;
      counts.set(a, cur);
    };
    if (t.to) add(t.to, "buys");
    if (t.from) add(t.from, "sells");
  }
  const traders = [...counts.entries()]
    .map(([address, s]) => ({ address, ...s, explorer: explorerAddress(address) }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 25);
  return {
    ok: true,
    query,
    token: p.baseToken,
    traders,
    note: "Flow proxy from recent explorer token transfers, not a full holder ledger.",
  };
}

export async function getSmartMoney(query: string) {
  const top = await getTopTraders(query);
  if (!top.ok || !("traders" in top)) return top;
  const smart = (top.traders || []).filter((t) => t.buys >= 2 && t.volume > 0).slice(0, 12);
  return { ...top, smart, note: "Wallets with repeat buys in the recent transfer window." };
}

export async function getFirstBuyers(query: string) {
  const pairs = await (query.match(/^0x[a-fA-F0-9]{40}$/) ? tokenPairs(query) : searchDex(query));
  const p = pairs[0];
  if (!p?.baseToken?.address) return { ok: false, error: `No market for ${query}` };
  const transfers = await explorer<ExplorerTx[]>({
    module: "account",
    action: "tokentx",
    address: p.baseToken.address,
    sort: "asc",
    page: "1",
    offset: "40",
  });
  return {
    ok: true,
    query,
    token: p.baseToken,
    first: (transfers || []).slice(0, 20).map((t) => ({
      hash: t.hash,
      from: t.from,
      to: t.to,
      timestamp: t.timeStamp ? Number(t.timeStamp) : null,
      explorer: t.hash ? explorerTx(t.hash) : null,
    })),
  };
}

export async function getGasOracle() {
  const [gas, block] = await Promise.all([gasPriceWei(), latestBlock()]);
  return {
    ok: true,
    chainId: CHAIN.id,
    block: block.number,
    gasPriceWei: gas.toString(),
    gasPriceGwei: Number(gas) / 1e9,
    suggested: {
      slow: Number(gas) / 1e9,
      standard: Number(gas) / 1e9,
      fast: (Number(gas) / 1e9) * 1.12,
    },
  };
}

export async function getBlockTool(id?: string) {
  const { rpc, hexToBigInt } = await import("./rpc");
  const tag = id && /^\d+$/.test(id) ? "0x" + BigInt(id).toString(16) : id && id.startsWith("0x") ? id : "latest";
  const block = await rpc<Record<string, unknown>>("eth_getBlockByNumber", [tag, false]);
  return {
    ok: Boolean(block),
    block,
    number: block?.number ? Number(hexToBigInt(String(block.number))) : null,
  };
}

export async function getContractMeta(address: string) {
  if (!isAddress(address)) return { ok: false, error: "Provide a contract address." };
  const meta = await erc20Meta(address);
  const pairs = await tokenPairs(address).catch(() => []);
  return {
    ok: true,
    address,
    explorer: explorerToken(address),
    erc20: meta,
    markets: pairs.length,
    pair: pairs[0]?.pairAddress || null,
  };
}

export async function compareTokens(a: string, b: string) {
  const [left, right] = await Promise.all([getTokenAnalytics(a), getTokenAnalytics(b)]);
  return { ok: true, left, right };
}

export async function getMarketOverview() {
  const [trend, gas, llama] = await Promise.all([
    fetchJson<{ data?: unknown[] }>(`${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/trending_pools?duration=1h`, {
      headers: { accept: "application/json;version=20230302" },
    }),
    getGasOracle(),
    fetchJson<Array<{ chainId?: number; tvl?: number; name?: string }>>(`${ENDPOINTS.llama}/v2/chains`),
  ]);
  const tvl = (llama.data || []).find((c) => c.chainId === CHAIN.id)?.tvl ?? null;
  return {
    ok: true,
    chainId: CHAIN.id,
    tvlUsd: tvl,
    gas: gas.gasPriceGwei,
    trendingPools: (trend.data?.data || []).slice(0, 12),
  };
}

export const addRobinhoodChainParams = {
  chainId: CHAIN.hexId,
  chainName: CHAIN.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [CHAIN.rpc],
  blockExplorerUrls: [CHAIN.explorer],
};
