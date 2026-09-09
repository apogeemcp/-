import { MEMO_PREFIX, NOTE_BURN_USD, ORBITX_MINT, SERVICE_WALLET_PUBLIC, scanUrl } from "./onchain-config";
import { parseMemoText, previewNote } from "./onchain-memo";

export type RawServiceTx = {
  signature: string;
  slot: number | null;
  blockTime: string | null;
  memo: string | null;
  orbitxDelta: number;
  solDelta: number;
};

export type PublicNote = {
  id: string;
  note: string;
  memo: string;
  source: string;
  wallet: string;
  memoStatus: "idle" | "pending" | "confirmed" | "failed";
  buyStatus: "idle" | "pending" | "confirmed" | "failed";
  burnStatus: "idle" | "pending" | "confirmed" | "failed";
  memoTx: string | null;
  buyTx: string | null;
  burnTx: string | null;
  memoUrl: string | null;
  buyUrl: string | null;
  burnUrl: string | null;
  tokenAmount: number | null;
  usdValue: number | null;
  solSpent: number | null;
  priceUsd: number | null;
  createdAt: string;
  memoConfirmedAt: string | null;
  buyConfirmedAt: string | null;
  burnConfirmedAt: string | null;
  error: string | null;
};

export type ChainActivity = {
  id: string;
  event_type: string;
  message: string;
  note_preview: string | null;
  token_amount: number | null;
  usd_value: number | null;
  status: string;
  transaction_signature: string | null;
  related_transaction_signature: string | null;
  solscan_url: string | null;
  created_at: string;
  confirmed_at: string | null;
  slot: number | null;
};

export type ChainStats = {
  totalBurnedUsd: number;
  orbitxBurned: number;
  totalMemos: number;
  totalBuys: number;
  solSpent: number;
  solSpentNative: number;
};

function emptyNote(tx: RawServiceTx, note: string): PublicNote {
  const at = tx.blockTime || new Date().toISOString();
  return {
    id: tx.signature,
    note,
    memo: `${MEMO_PREFIX}${note}`,
    source: "chain",
    wallet: SERVICE_WALLET_PUBLIC,
    memoStatus: "confirmed",
    buyStatus: "idle",
    burnStatus: "idle",
    memoTx: tx.signature,
    buyTx: null,
    burnTx: null,
    memoUrl: scanUrl(tx.signature),
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

function activity(
  type: string,
  message: string,
  tx: RawServiceTx,
  extra: Partial<ChainActivity> = {},
): ChainActivity {
  const at = tx.blockTime || new Date().toISOString();
  return {
    id: `${type}:${tx.signature}`,
    event_type: type,
    message,
    note_preview: extra.note_preview ?? null,
    token_amount: extra.token_amount ?? null,
    usd_value: extra.usd_value ?? null,
    status: extra.status || "confirmed",
    transaction_signature: tx.signature,
    related_transaction_signature: extra.related_transaction_signature ?? null,
    solscan_url: scanUrl(tx.signature),
    created_at: at,
    confirmed_at: at,
    slot: tx.slot,
  };
}

export function assembleFromChain(txsNewestFirst: RawServiceTx[]): {
  notes: PublicNote[];
  activity: ChainActivity[];
  stats: ChainStats;
} {
  const chrono = [...txsNewestFirst].reverse();
  const notes: PublicNote[] = [];
  const items: ChainActivity[] = [];
  let open: PublicNote | null = null;

  const flush = () => {
    if (open) notes.push(open);
    open = null;
  };

  for (const tx of chrono) {
    const parsed = tx.memo ? parseMemoText(tx.memo.replace(/^"|"$/g, "")) : null;
    if (parsed?.ok) {
      flush();
      open = emptyNote(tx, parsed.note);
      items.push(
        activity("MEMO_CREATED", "New on-chain memo recorded", tx, {
          note_preview: previewNote(parsed.note, 200),
        }),
      );
      continue;
    }
    if (open && tx.orbitxDelta > 1e-9 && open.buyStatus !== "confirmed") {
      open.buyStatus = "confirmed";
      open.buyTx = tx.signature;
      open.buyUrl = scanUrl(tx.signature);
      open.buyConfirmedAt = tx.blockTime;
      open.tokenAmount = tx.orbitxDelta;
      open.usdValue = NOTE_BURN_USD;
      open.solSpent = Math.abs(tx.solDelta);
      items.push(
        activity("ORBITX_PURCHASE", "$ORBITX purchased", tx, {
          note_preview: previewNote(open.note, 200),
          token_amount: tx.orbitxDelta,
          usd_value: NOTE_BURN_USD,
          related_transaction_signature: open.memoTx,
        }),
      );
      continue;
    }
    if (open && tx.orbitxDelta < -1e-9 && open.burnStatus !== "confirmed") {
      open.burnStatus = "confirmed";
      open.burnTx = tx.signature;
      open.burnUrl = scanUrl(tx.signature);
      open.burnConfirmedAt = tx.blockTime;
      open.tokenAmount = Math.abs(tx.orbitxDelta);
      open.usdValue = NOTE_BURN_USD;
      items.push(
        activity("ORBITX_BURN", "$ORBITX burned permanently", tx, {
          note_preview: previewNote(open.note, 200),
          token_amount: Math.abs(tx.orbitxDelta),
          usd_value: NOTE_BURN_USD,
          related_transaction_signature: open.buyTx || open.memoTx,
        }),
      );
      continue;
    }
    if (!open && tx.orbitxDelta < -1e-9) {
      items.push(
        activity("ORBITX_BURN", "Admin $ORBITX burn", tx, {
          token_amount: Math.abs(tx.orbitxDelta),
          usd_value: NOTE_BURN_USD,
        }),
      );
    }
  }
  flush();

  const newestNotes = notes.reverse();
  const newestActivity = items.reverse();
  const burns = newestActivity.filter((a) => a.event_type === "ORBITX_BURN" && a.status === "confirmed");
  const buys = newestActivity.filter((a) => a.event_type === "ORBITX_PURCHASE" && a.status === "confirmed");
  const memos = newestActivity.filter((a) => a.event_type === "MEMO_CREATED" && a.status === "confirmed");
  return {
    notes: newestNotes,
    activity: newestActivity,
    stats: {
      totalBurnedUsd: burns.length * NOTE_BURN_USD,
      orbitxBurned: burns.reduce((s, a) => s + Number(a.token_amount || 0), 0),
      totalMemos: memos.length,
      totalBuys: buys.length,
      solSpent: buys.reduce((s, a) => s + Number(a.usd_value || 0), 0),
      solSpentNative: newestNotes.reduce((s, n) => s + Number(n.solSpent || 0), 0),
    },
  };
}

export function spendLast24h(activity: ChainActivity[], notes: PublicNote[]) {
  const since = Date.now() - 24 * 3600_000;
  const burns = activity.filter(
    (a) => a.event_type === "ORBITX_BURN" && a.status === "confirmed" && new Date(a.created_at).getTime() >= since,
  );
  const recentNotes = notes.filter((n) => n.buyStatus === "confirmed" && new Date(n.buyConfirmedAt || n.createdAt).getTime() >= since);
  return {
    burnUsd: burns.length * NOTE_BURN_USD,
    sol: recentNotes.reduce((s, n) => s + Number(n.solSpent || 0), 0),
  };
}

/** Keep a prior complete chain scan when RPC returns a partial or empty fetch. */
export function preferAssembledScan<T extends { notes: unknown[] }>(
  previous: T | null,
  next: T,
  scan: { requested: number; fetched: number },
): T {
  if (!previous) return next;
  if (scan.requested > 0 && scan.fetched === 0) return previous;
  if (scan.fetched < scan.requested && next.notes.length < previous.notes.length) return previous;
  return next;
}
