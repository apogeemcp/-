import { CHAIN, ENDPOINTS, isAddress } from "./chain";
import { fetchJson } from "./rpc";

const GECKO_HDR = { accept: "application/json;version=20230302" };

export type GeckoPoolRow = {
  id?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
};

export type GeckoTrade = {
  side: "buy" | "sell";
  hash: string | null;
  wallet: string | null;
  amount: number | null;
  usd: number | null;
  priceUsd: number | null;
  timestamp: number | null;
  explorer: string | null;
};

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function geckoRelAddress(rel: unknown): string | null {
  const id =
    rel && typeof rel === "object" && "data" in rel
      ? String((rel as { data?: { id?: string } }).data?.id || "")
      : "";
  const m = id.match(/(0x[a-fA-F0-9]{40})/);
  return m ? m[1] : null;
}

export function geckoPools(data: GeckoPoolRow[] | undefined) {
  return (data || []).map((row) => {
    const a = (row.attributes || {}) as Record<string, unknown>;
    const pc = (a.price_change_percentage as Record<string, unknown>) || {};
    const rel = (row.relationships || {}) as Record<string, unknown>;
    const tokenAddress = geckoRelAddress(rel.base_token);
    const quoteAddress = geckoRelAddress(rel.quote_token);
    const name = String(a.name || "");
    const symbol = name.split("/")[0]?.trim() || null;
    return {
      id: row.id,
      poolAddress: a.address ? String(a.address) : null,
      address: tokenAddress || String(a.address || ""),
      tokenAddress,
      quoteAddress,
      name,
      symbol,
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

export async function geckoTrending(duration = "1h") {
  const res = await fetchJson<{ data?: GeckoPoolRow[] }>(
    `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/trending_pools?duration=${encodeURIComponent(duration)}`,
    { headers: GECKO_HDR },
  );
  return geckoPools(res.data?.data);
}

export async function geckoNewPools() {
  const res = await fetchJson<{ data?: GeckoPoolRow[] }>(
    `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/new_pools?page=1`,
    { headers: GECKO_HDR },
  );
  return geckoPools(res.data?.data);
}

export async function geckoTopPools() {
  const res = await fetchJson<{ data?: GeckoPoolRow[] }>(
    `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/pools?page=1`,
    { headers: GECKO_HDR },
  );
  return geckoPools(res.data?.data);
}

export async function geckoOhlcv(pool: string, timeframe = "minute", aggregate = 5, limit = 120) {
  const res = await fetchJson<{ data?: { attributes?: { ohlcv_list?: number[][] } } }>(
    `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/pools/${pool}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${Math.min(limit, 1000)}&currency=usd`,
    { headers: GECKO_HDR },
  );
  const rows = res.data?.data?.attributes?.ohlcv_list || [];
  return rows
    .slice()
    .reverse()
    .map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));
}

export async function geckoToken(address: string) {
  if (!isAddress(address)) return null;
  const [core, info] = await Promise.all([
    fetchJson<{ data?: { attributes?: Record<string, unknown> } }>(
      `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/tokens/${address}`,
      { headers: GECKO_HDR },
    ),
    fetchJson<{ data?: { attributes?: Record<string, unknown> } }>(
      `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/tokens/${address}/info`,
      { headers: GECKO_HDR },
    ),
  ]);
  const a = { ...(core.data?.data?.attributes || {}), ...(info.data?.data?.attributes || {}) };
  if (!a.address && !a.symbol) return null;
  const image =
    (typeof a.image_url === "string" && a.image_url) ||
    (a.image && typeof a.image === "object" && "large" in a.image ? String((a.image as { large?: string }).large || "") : "") ||
    null;
  const twitter = a.twitter_handle ? `https://x.com/${String(a.twitter_handle).replace(/^@/, "")}` : null;
  const websites = Array.isArray(a.websites) ? (a.websites as string[]) : [];
  return {
    address: String(a.address || address),
    name: a.name ? String(a.name) : null,
    symbol: a.symbol ? String(a.symbol) : null,
    decimals: num(a.decimals),
    image,
    banner: a.banner_image_url ? String(a.banner_image_url) : null,
    description: a.description ? String(a.description) : null,
    website: websites[0] || null,
    websites,
    twitter,
    telegram: a.telegram_handle ? `https://t.me/${String(a.telegram_handle).replace(/^@/, "")}` : null,
    discord: a.discord_url ? String(a.discord_url) : null,
    priceUsd: num(a.price_usd),
    fdvUsd: num(a.fdv_usd),
    marketCapUsd: num(a.market_cap_usd),
    liquidityUsd: num(a.total_reserve_in_usd),
    volume24h: num((a.volume_usd as Record<string, unknown> | undefined)?.h24),
    totalSupply: a.normalized_total_supply ? String(a.normalized_total_supply) : a.total_supply ? String(a.total_supply) : null,
    coingeckoId: a.coingecko_coin_id ? String(a.coingecko_coin_id) : null,
    gtScore: num(a.gt_score),
    gtVerified: Boolean(a.gt_verified),
  };
}

export async function geckoTokenPools(address: string) {
  if (!isAddress(address)) return [];
  const res = await fetchJson<{ data?: GeckoPoolRow[] }>(
    `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/tokens/${address}/pools?page=1`,
    { headers: GECKO_HDR },
  );
  return geckoPools(res.data?.data);
}

export async function geckoPoolTrades(pool: string, limit = 80): Promise<GeckoTrade[]> {
  if (!pool) return [];
  const res = await fetchJson<{ data?: Array<{ attributes?: Record<string, unknown> }> }>(
    `${ENDPOINTS.gecko}/networks/${CHAIN.geckoNetwork}/pools/${encodeURIComponent(pool)}/trades`,
    { headers: GECKO_HDR },
  );
  const rows = res.data?.data || [];
  return rows.slice(0, limit).map((row) => {
    const a = row.attributes || {};
    const kind = String(a.kind || "").toLowerCase() === "sell" ? "sell" : "buy";
    const hash = a.tx_hash ? String(a.tx_hash) : null;
    const ts = a.block_timestamp ? Date.parse(String(a.block_timestamp)) : NaN;
    const usd = num(a.volume_in_usd);
    const price = num(a.price_to_in_usd) ?? num(a.price_from_in_usd);
    const amount = kind === "buy" ? num(a.to_token_amount) : num(a.from_token_amount);
    return {
      side: kind as "buy" | "sell",
      hash,
      wallet: a.tx_from_address ? String(a.tx_from_address) : null,
      amount,
      usd,
      priceUsd: price,
      timestamp: Number.isFinite(ts) ? Math.floor(ts / 1000) : null,
      explorer: hash ? `${CHAIN.explorer}/tx/${hash}` : null,
    };
  });
}
