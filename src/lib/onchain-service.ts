import { consumeNamedLimit } from "./ratelimit";
import { ORBITX_MINT, NOTE_BURN_USD, SERVICE_WALLET_PUBLIC, scanUrl } from "./onchain-config";
import { buildMemoText, parseMemoText, sanitizeNote } from "./onchain-memo";
import { effectiveFlags } from "./onchain-store";
import {
  assembleFromChain,
  preferAssembledScan,
  spendLast24h,
  type ChainActivity,
  type ChainStats,
  type PublicNote,
} from "./onchain-chain-index";

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

type Assembled = ReturnType<typeof assembleFromChain>;

let scanCache: { at: number; data: Assembled } | null = null;

export function invalidateChainScan() {
  scanCache = null;
}

async function loadAssembled(limit = 48): Promise<Assembled> {
  if (scanCache && Date.now() - scanCache.at < 12_000) return scanCache.data;
  const { fetchServiceRawTxs } = await loadChain();
  try {
    const { txs, requested, fetched } = await fetchServiceRawTxs(limit);
    const next = preferAssembledScan(scanCache?.data ?? null, assembleFromChain(txs), { requested, fetched });
    scanCache = { at: Date.now(), data: next };
    return next;
  } catch (error) {
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
    if (flags.autoBurnEnabled) {
      const resumed = await resumeNote(note.id, note);
      if (resumed) note = resumed;
    }
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
  let note = seed || assembled.notes.find((n) => n.id === id || n.memoTx === id) || null;
  if (!note || note.memoStatus !== "confirmed") return note;
  if (!flags.autoBurnEnabled) return note;

  const spend = spendLast24h(assembled.activity, assembled.notes);
  if (spend.burnUsd >= flags.maxDailyBurnUsd) {
    return { ...note, error: "Daily $ORBITX buy/burn USD limit reached." };
  }
  if (spend.sol >= flags.maxDailySolSpend) {
    return { ...note, error: "Daily SOL spend limit reached." };
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
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ...note, buyStatus: "failed", error: message.slice(0, 400) };
    }
  }

  if (note.buyStatus !== "confirmed") return note;
  if (note.burnStatus === "confirmed" && note.burnTx) return note;

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
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ...note, burnStatus: "failed", error: message.slice(0, 400) };
  }
  return note;
}

export async function recoverPending(limit = 6) {
  const assembled = await loadAssembled();
  const pending = assembled.notes.filter((n) => n.memoStatus === "confirmed" && n.burnStatus !== "confirmed").slice(0, limit);
  const out = [];
  for (const row of pending) {
    out.push(await resumeNote(row.id));
  }
  return out;
}

export async function getNoteBySignature(signature: string) {
  const assembled = await loadAssembled().catch(() => null);
  let note =
    assembled?.notes.find((n) => n.memoTx === signature || n.buyTx === signature || n.burnTx === signature) || null;
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
  try {
    const assembled = await loadAssembled(Math.min(80, offset + limit + 8));
    const items =
      eventType === "ALL"
        ? assembled.activity
        : assembled.activity.filter((a: ChainActivity) => a.event_type === eventType);
    return {
      ok: true,
      source: "solana",
      items: items.slice(offset, offset + limit),
      stats: assembled.stats,
      limit,
      offset,
      nextOffset: offset + limit,
    };
  } catch {
    return {
      ok: true,
      source: "solana",
      items: [] as ChainActivity[],
      stats: {
        totalBurnedUsd: 0,
        orbitxBurned: 0,
        totalMemos: 0,
        totalBuys: 0,
        solSpent: 0,
        solSpentNative: 0,
      } satisfies ChainStats,
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
    return { ok: true, source: "solana", items: items.slice(offset, offset + limit), limit, offset };
  } catch {
    return { ok: true, source: "solana", items: [] as PublicNote[], limit, offset };
  }
}

export async function walletStatus() {
  const flags = await effectiveFlags();
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
    /* chain unread — still return wallet */
  }
  const fallback = {
    ok: true as const,
    wallet: servicePublicAddress(),
    sol: 0,
    orbitx: 0,
    mint: ORBITX_MINT,
    network: "solana-mainnet",
    ready: false,
    notesEnabled: flags.notesEnabled,
    autoBurnEnabled: flags.autoBurnEnabled,
    noteBurnUsd: NOTE_BURN_USD,
    maxDailyBurnUsd: flags.maxDailyBurnUsd,
    maxDailySolSpend: flags.maxDailySolSpend,
    spentTodayUsd: spend.burnUsd,
    spentTodaySol: spend.sol,
    source: "solana",
    marketPriceUsd: null as number | null,
    estimatedSolForNote: null as number | null,
    stats,
    scanWallet: `https://solscan.io/account/${servicePublicAddress()}`,
  };
  try {
    const { serviceWalletReady } = await loadSigner();
    const chain = await loadChain();
    const ready = serviceWalletReady();
    const [balances, price, sized] = await Promise.all([
      ready
        ? chain.serviceBalances().catch(() => ({ sol: 0, orbitx: 0, wallet: servicePublicAddress() }))
        : Promise.resolve({ sol: 0, orbitx: 0, wallet: servicePublicAddress() }),
      chain.orbitxMarketPrice().catch(() => null),
      chain.sizeNoteBurn().catch(() => null),
    ]);
    return {
      ...fallback,
      wallet: balances.wallet,
      sol: balances.sol,
      orbitx: balances.orbitx,
      ready,
      marketPriceUsd: price?.priceUsd ?? null,
      estimatedSolForNote: sized?.solAmount ?? null,
      scanWallet: `https://solscan.io/account/${balances.wallet}`,
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
