import { consumeNamedLimit } from "./ratelimit";
import { ORBITX_MINT, NOTE_BURN_USD, SERVICE_WALLET_PUBLIC, scanUrl } from "./onchain-config";
import { buildMemoText, parseMemoText, sanitizeNote } from "./onchain-memo";
import { effectiveFlags } from "./onchain-store";
import {
  assembleFromChain,
  mergeAssembled,
  preferAssembledScan,
  spendLast24h,
  type AssembledChain,
  type ChainActivity,
  type ChainStats,
  type PublicNote,
} from "./onchain-chain-index";
import { sqlConfigured } from "./pg-pool";

function servicePublicAddress() {
  return SERVICE_WALLET_PUBLIC;
}

async function loadSigner() {
  return import("./orbitx-signer");
}

async function loadChain() {
  return import("./orbitx-chain");
}

export type WriteNoteInput = {
  note: unknown;
  idempotencyKey?: unknown;
  source: "website" | "mcp";
  wallet?: string | null;
};

type Assembled = AssembledChain;

let scanCache: { at: number; data: Assembled } | null = null;
let chainRefresh: Promise<void> | null = null;
const WALLET_SNAPSHOT_TTL_MS = 20_000;

export function invalidateChainScan() {
  scanCache = null;
}

async function loadSql() {
  return import("./onchain-sql");
}

async function persistSafe(data: Assembled) {
  try {
    const sql = await loadSql();
    await sql.persistAssembled(data);
  } catch {
    /* chain remains source of truth */
  }
}

function persistQuiet(data: Assembled) {
  void persistSafe(data);
}

async function persistNoteSafe(note: PublicNote) {
  try {
    const sql = await loadSql();
    await sql.persistNoteBundle(note);
    const extra = {
      notes: [note],
      activity: [],
      stats: scanCache?.data.stats ?? {
        totalBurnedUsd: 0,
        orbitxBurned: 0,
        totalMemos: 0,
        totalBuys: 0,
        solSpent: 0,
        solSpentNative: 0,
      },
    };
    scanCache = { at: Date.now(), data: mergeAssembled(scanCache?.data ?? extra, extra) };
  } catch {
    /* chain remains source of truth */
  }
}

async function scanChain(limit: number): Promise<Assembled> {
  const { fetchServiceRawTxs } = await loadChain();
  const { txs, requested, fetched } = await fetchServiceRawTxs(limit);
  return preferAssembledScan(scanCache?.data ?? null, assembleFromChain(txs), { requested, fetched });
}

function scheduleChainRefresh(limit: number, baseline: Assembled) {
  if (chainRefresh) return;
  chainRefresh = (async () => {
    try {
      const next = await scanChain(limit);
      const combined = mergeAssembled(baseline, next);
      scanCache = { at: Date.now(), data: combined };
      persistQuiet(combined);
    } catch {
      /* SQL/cache already has the feed */
    }
  })().finally(() => {
    chainRefresh = null;
  });
}

async function loadAssembled(limit = 48): Promise<Assembled> {
  const sql = await loadSql();
  const fromSql = await sql.loadAssembledFromSql(limit).catch(() => null);
  if (fromSql && fromSql.notes.length > 0) {
    const merged = mergeAssembled(fromSql, scanCache?.data ?? null);
    scanCache = { at: Date.now(), data: merged };
    scheduleChainRefresh(limit, merged);
    return merged;
  }
  if (scanCache && Date.now() - scanCache.at < 12_000) return scanCache.data;
  try {
    const next = await scanChain(limit);
    const combined = mergeAssembled(fromSql, next);
    scanCache = { at: Date.now(), data: combined };
    await persistSafe(combined);
    return combined;
  } catch (error) {
    if (fromSql) return fromSql;
    if (scanCache?.data) return scanCache.data;
    throw error;
  }
}

function fromMemoTx(memo: {
  signature: string;
  slot: number | null;
  blockTime: string | null;
  explorerUrl: string;
}, note: string): PublicNote {
  const at = memo.blockTime || new Date().toISOString();
  return {
    id: memo.signature,
    note,
    memo: buildMemoText(note),
    source: "chain",
    wallet: servicePublicAddress(),
    memoStatus: "confirmed",
    buyStatus: "idle",
    burnStatus: "idle",
    memoTx: memo.signature,
    buyTx: null,
    burnTx: null,
    memoUrl: memo.explorerUrl,
    buyUrl: null,
    burnUrl: null,
    tokenAmount: null,
    usdValue: null,
    solSpent: null,
    priceUsd: null,
    createdAt: at,
    memoConfirmedAt: at,
    buyConfirmedAt: null,
    burnConfirmedAt: null,
    error: null,
  };
}

export async function writeOnchainNote(input: WriteNoteInput) {
  const cleaned = sanitizeNote(input.note);
  if (!cleaned.ok) return { ok: false as const, status: 400, error: cleaned.error };
  const { serviceWalletReady } = await loadSigner();
  if (!serviceWalletReady()) {
    return { ok: false as const, status: 503, error: "Service wallet is not configured. Notes are not signing." };
  }
  const flags = await effectiveFlags();
  if (!flags.notesEnabled) {
    return { ok: false as const, status: 503, error: flags.pausedReason || "On-chain notes are paused." };
  }
  const hourKey = `onchain:${input.source}:${(input.wallet || "anon").slice(0, 64)}`;
  const perWallet = consumeNamedLimit(hourKey, input.source === "mcp" ? 6 : 12, 60 * 60_000);
  const global = consumeNamedLimit("onchain:global", 40, 60 * 60_000);
  if (!perWallet.ok || !global.ok) {
    return { ok: false as const, status: 429, error: "Note rate limit reached. Try again later." };
  }

  const existing = await loadAssembled().catch(() => null);
  const recent = existing?.notes.find(
    (n) => n.note === cleaned.note && Date.now() - new Date(n.createdAt).getTime() < 15 * 60_000,
  );
  if (recent) {
    if (recent.memoStatus === "confirmed" && flags.autoBurnEnabled && recent.burnStatus !== "confirmed") {
      void resumeNote(recent.id);
    }
    return { ok: true as const, status: 200, idempotent: true, note: recent };
  }

  try {
    const { sendMemo } = await loadChain();
    const memo = await sendMemo(buildMemoText(cleaned.note));
    invalidateChainScan();
    let note = fromMemoTx(memo, cleaned.note);
    await persistNoteSafe(note);
    if (scanCache?.data) {
      scanCache = { at: Date.now(), data: mergeAssembled(scanCache.data, { notes: [note], activity: [], stats: scanCache.data.stats }) };
    }
    if (flags.autoBurnEnabled) {
      const resumed = await resumeNote(note.id, note);
      if (resumed) note = resumed;
    }
    await persistNoteSafe(note);
    return { ok: true as const, status: 201, idempotent: false, note };
  } catch {
    return { ok: false as const, status: 502, error: "Memo was not confirmed on Solana." };
  }
}

export async function resumeNote(id: string, seed?: PublicNote | null): Promise<PublicNote | null> {
  const flags = await effectiveFlags();
  invalidateChainScan();
  let assembled: Assembled = { notes: [], activity: [], stats: { totalBurnedUsd: 0, orbitxBurned: 0, totalMemos: 0, totalBuys: 0, solSpent: 0, solSpentNative: 0 } };
  try {
    assembled = await loadAssembled();
  } catch {
    /* buy/burn can still run from the seed memo */
  }
  const sql = await loadSql();
  const fromSql = seed?.memoTx
    ? seed
    : await sql.loadNoteByMemoTx(id).catch(() => null);
  let note = seed || fromSql || assembled.notes.find((n) => n.id === id || n.memoTx === id) || null;
  if (!note || note.memoStatus !== "confirmed") return note;
  if (!flags.autoBurnEnabled) return note;

  const spend = spendLast24h(assembled.activity, assembled.notes);
  if (spend.burnUsd >= flags.maxDailyBurnUsd) {
    const limited = { ...note, error: "Daily $ORBITX buy/burn USD limit reached." };
    await persistNoteSafe(limited);
    return limited;
  }
  if (spend.sol >= flags.maxDailySolSpend) {
    const limited = { ...note, error: "Daily SOL spend limit reached." };
    await persistNoteSafe(limited);
    return limited;
  }

  if (note.buyStatus !== "confirmed") {
    try {
      const { buyOrbitxForNote } = await loadChain();
      const buy = await buyOrbitxForNote();
      note = {
        ...note,
        buyStatus: "confirmed",
        buyTx: buy.tx.signature,
        buyUrl: scanUrl(buy.tx.signature),
        tokenAmount: buy.tokenAmount,
        usdValue: buy.usdValue,
        solSpent: buy.solSpent,
        priceUsd: buy.priceUsd,
        buyConfirmedAt: buy.tx.blockTime,
        error: null,
      };
      invalidateChainScan();
      await persistNoteSafe(note);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const failed = { ...note, buyStatus: "failed" as const, error: message.slice(0, 400) };
      await persistNoteSafe(failed);
      return failed;
    }
  }

  if (note.buyStatus !== "confirmed") return note;
  if (note.burnStatus === "confirmed" && note.burnTx) {
    await persistNoteSafe(note);
    return note;
  }

  try {
    const { burnOrbitx } = await loadChain();
    const burn = await burnOrbitx(Number(note.tokenAmount || 0) || undefined);
    note = {
      ...note,
      burnStatus: "confirmed",
      burnTx: burn.tx.signature,
      burnUrl: scanUrl(burn.tx.signature),
      tokenAmount: burn.tokenAmount,
      burnConfirmedAt: burn.tx.blockTime,
      error: null,
    };
    invalidateChainScan();
    await persistNoteSafe(note);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const failed = { ...note, burnStatus: "failed" as const, error: message.slice(0, 400) };
    await persistNoteSafe(failed);
    return failed;
  }
  await persistNoteSafe(note);
  return note;
}

export async function recoverPending(limit = 6) {
  const assembled = await loadAssembled();
  const sql = await loadSql();
  await sql.persistAssembled(assembled).catch(() => undefined);
  const pending = assembled.notes.filter((n) => n.memoStatus === "confirmed" && n.burnStatus !== "confirmed").slice(0, limit);
  const out = [];
  for (const row of pending) {
    out.push(await resumeNote(row.id));
  }
  const refreshed = await loadAssembled().catch(() => assembled);
  await sql.persistAssembled(refreshed).catch(() => undefined);
  return out;
}

export async function getNoteBySignature(signature: string) {
  const sql = await loadSql();
  const fromSql = await sql.loadNoteByMemoTx(signature).catch(() => null);
  const assembled = await loadAssembled().catch(() => null);
  let note =
    fromSql ||
    assembled?.notes.find((n) => n.memoTx === signature || n.buyTx === signature || n.burnTx === signature) ||
    null;
  if (note) {
    return { note, local: note, chain: { ok: true as const, memo: note.memo, signature } };
  }
  const { readMemoFromSignature } = await loadChain();
  const chain = await readMemoFromSignature(signature);
  if (!note && chain.ok && chain.memo) {
    const parsed = parseMemoText(String(chain.memo).replace(/^"|"$/g, ""));
    if (parsed.ok) {
      note = fromMemoTx(
        {
          signature,
          slot: chain.slot ?? null,
          blockTime: chain.blockTime ?? null,
          explorerUrl: scanUrl(signature),
        },
        parsed.note,
      );
    }
  }
  if (note) await persistNoteSafe(note);
  return { note, local: note, chain };
}

export async function publicFeed(input: { type?: string; limit?: number; offset?: number }) {
  const limit = Math.min(50, Math.max(1, Number(input.limit || 20)));
  const offset = Math.max(0, Number(input.offset || 0));
  const typeMap: Record<string, string> = {
    ALL: "ALL",
    MEMOS: "MEMO_CREATED",
    BUYS: "ORBITX_PURCHASE",
    BURNS: "ORBITX_BURN",
    MEMO_CREATED: "MEMO_CREATED",
    ORBITX_PURCHASE: "ORBITX_PURCHASE",
    ORBITX_BURN: "ORBITX_BURN",
  };
  const eventType = typeMap[String(input.type || "ALL").toUpperCase()] || "ALL";
  const emptyStats: ChainStats = {
    totalBurnedUsd: 0,
    orbitxBurned: 0,
    totalMemos: 0,
    totalBuys: 0,
    solSpent: 0,
    solSpentNative: 0,
  };
  try {
    const assembled = await loadAssembled(Math.min(80, offset + limit + 8));
    const items =
      eventType === "ALL"
        ? assembled.activity
        : assembled.activity.filter((a: ChainActivity) => a.event_type === eventType);
    return {
      ok: true,
      source: sqlConfigured() ? "sql" : "solana",
      indexed: sqlConfigured(),
      items: items.slice(offset, offset + limit),
      stats: assembled.stats,
      limit,
      offset,
      nextOffset: offset + limit,
    };
  } catch {
    const sql = await loadSql();
    const fromSql = await sql.loadAssembledFromSql(Math.min(80, offset + limit + 8)).catch(() => null);
    if (fromSql) {
      const items =
        eventType === "ALL"
          ? fromSql.activity
          : fromSql.activity.filter((a: ChainActivity) => a.event_type === eventType);
      return {
        ok: true,
        source: "sql",
        indexed: true,
        items: items.slice(offset, offset + limit),
        stats: fromSql.stats,
        limit,
        offset,
        nextOffset: offset + limit,
      };
    }
    return {
      ok: true,
      source: sqlConfigured() ? "sql" : "solana",
      indexed: sqlConfigured(),
      items: [] as ChainActivity[],
      stats: emptyStats,
      limit,
      offset,
      nextOffset: offset + limit,
    };
  }
}

export async function notesIndex(input: { wallet?: string; search?: string; limit?: number; offset?: number }) {
  const limit = Math.min(50, Math.max(1, Number(input.limit || 20)));
  const offset = Math.max(0, Number(input.offset || 0));
  try {
    const assembled = await loadAssembled(Math.min(80, offset + limit + 8));
    let items = assembled.notes;
    if (input.wallet) items = items.filter((n) => n.wallet === input.wallet);
    if (input.search) {
      const q = input.search.toLowerCase();
      items = items.filter((n) => n.note.toLowerCase().includes(q));
    }
    return { ok: true, source: sqlConfigured() ? "sql" : "solana", indexed: sqlConfigured(), items: items.slice(offset, offset + limit), limit, offset };
  } catch {
    const sql = await loadSql();
    const fromSql = await sql.loadAssembledFromSql(Math.min(80, offset + limit + 8)).catch(() => null);
    let items = fromSql?.notes ?? [];
    if (input.wallet) items = items.filter((n) => n.wallet === input.wallet);
    if (input.search) {
      const q = input.search.toLowerCase();
      items = items.filter((n) => n.note.toLowerCase().includes(q));
    }
    return { ok: true, source: fromSql ? "sql" : "solana", indexed: sqlConfigured(), items: items.slice(offset, offset + limit), limit, offset };
  }
}

export async function walletStatus() {
  const flags = await effectiveFlags();
  const sql = await loadSql();
  const snap = await sql.loadWalletSnapshot().catch(() => null);
  let stats: ChainStats = {
    totalBurnedUsd: 0,
    orbitxBurned: 0,
    totalMemos: 0,
    totalBuys: 0,
    solSpent: 0,
    solSpentNative: 0,
  };
  let spend = { burnUsd: 0, sol: 0 };
  try {
    const assembled = await loadAssembled();
    stats = assembled.stats;
    spend = spendLast24h(assembled.activity, assembled.notes);
  } catch {
    /* still return wallet from snapshot or RPC */
  }
  const indexed = sqlConfigured();
  const fallback = {
    ok: true as const,
    wallet: snap?.wallet || servicePublicAddress(),
    sol: snap?.sol ?? 0,
    orbitx: snap?.orbitx ?? 0,
    mint: ORBITX_MINT,
    network: "solana-mainnet",
    ready: snap?.ready ?? false,
    notesEnabled: flags.notesEnabled,
    autoBurnEnabled: flags.autoBurnEnabled,
    noteBurnUsd: NOTE_BURN_USD,
    maxDailyBurnUsd: flags.maxDailyBurnUsd,
    maxDailySolSpend: flags.maxDailySolSpend,
    spentTodayUsd: spend.burnUsd,
    spentTodaySol: spend.sol,
    source: indexed ? "sql" : "solana",
    indexed,
    sqlReady: indexed,
    marketPriceUsd: snap?.priceUsd ?? null,
    estimatedSolForNote: snap?.estimatedSolForNote ?? null,
    stats,
    scanWallet: `https://solscan.io/account/${snap?.wallet || servicePublicAddress()}`,
  };

  const snapFresh = Boolean(snap && Date.now() - snap.updatedAtMs < WALLET_SNAPSHOT_TTL_MS);
  const refreshLive = async () => {
    const { serviceWalletReady } = await loadSigner();
    const chain = await loadChain();
    const ready = serviceWalletReady();
    const [balances, price, sized] = await Promise.all([
      ready
        ? chain.serviceBalances().catch(() => ({ sol: snap?.sol ?? 0, orbitx: snap?.orbitx ?? 0, wallet: servicePublicAddress() }))
        : Promise.resolve({ sol: snap?.sol ?? 0, orbitx: snap?.orbitx ?? 0, wallet: servicePublicAddress() }),
      chain.orbitxMarketPrice().catch(() => (snap?.priceUsd != null ? { priceUsd: snap.priceUsd } : null)),
      chain.sizeNoteBurn().catch(() => (snap?.estimatedSolForNote != null ? { solAmount: snap.estimatedSolForNote } : null)),
    ]);
    const live = {
      wallet: balances.wallet,
      sol: balances.sol,
      orbitx: balances.orbitx,
      ready,
      priceUsd: price?.priceUsd ?? snap?.priceUsd ?? null,
      estimatedSolForNote: sized?.solAmount ?? snap?.estimatedSolForNote ?? null,
    };
    await sql.saveWalletSnapshot(live).catch(() => undefined);
    return live;
  };

  if (snapFresh) {
    void refreshLive().catch(() => undefined);
    return fallback;
  }

  try {
    const live = await refreshLive();
    return {
      ...fallback,
      wallet: live.wallet,
      sol: live.sol,
      orbitx: live.orbitx,
      ready: live.ready,
      marketPriceUsd: live.priceUsd,
      estimatedSolForNote: live.estimatedSolForNote,
      scanWallet: `https://solscan.io/account/${live.wallet}`,
    };
  } catch {
    return fallback;
  }
}

export async function adminBurnOrbitx(amountUi?: number) {
  const { serviceWalletReady } = await loadSigner();
  if (!serviceWalletReady()) return { ok: false as const, error: "Service wallet is not configured." };
  const flags = await effectiveFlags();
  if (!flags.autoBurnEnabled) return { ok: false as const, error: "Auto-burn is paused." };
  const { burnOrbitx } = await loadChain();
  const burn = await burnOrbitx(amountUi);
  invalidateChainScan();
  return { ok: true as const, signature: burn.tx.signature, explorerUrl: scanUrl(burn.tx.signature), tokenAmount: burn.tokenAmount };
}

export { scanUrl };
export type { PublicNote };
