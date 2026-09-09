import { randomUUID } from "crypto";
import { consumeNamedLimit } from "./ratelimit";
import { ORBITX_MINT, NOTE_BURN_USD, scanUrl } from "./onchain-config";
import { buildMemoText, isIdempotencyKey, sanitizeNote } from "./onchain-memo";
import { burnOrbitx, buyOrbitxForNote, orbitxMarketPrice, readMemoFromSignature, sendMemo, serviceBalances, sizeNoteBurn } from "./orbitx-chain";
import { servicePublicAddress, serviceWalletReady } from "./orbitx-signer";
import {
  activityStats,
  dailySpend,
  effectiveFlags,
  findNoteById,
  findNoteByIdempotency,
  findNoteByMemoTx,
  insertActivity,
  insertNote,
  listActivity,
  listNotes,
  notePublic,
  patchNote,
  pendingRecoveries,
  type NoteRow,
} from "./onchain-store";
import { supabaseAdmin } from "./supabase-admin";

export type WriteNoteInput = {
  note: unknown;
  idempotencyKey?: unknown;
  source: "website" | "mcp";
  wallet?: string | null;
};

function asNote(row: unknown): NoteRow | null {
  if (!row || typeof row !== "object") return null;
  if (Array.isArray(row)) return (row[0] as NoteRow) || null;
  return row as NoteRow;
}

async function publish(
  note: NoteRow,
  event: Parameters<typeof insertActivity>[0]["event_type"],
  message: string,
  extra: Partial<Parameters<typeof insertActivity>[0]> = {},
) {
  await insertActivity({
    event_type: event,
    note_id: note.id,
    wallet_address: extra.wallet_address ?? servicePublicAddress(),
    note_preview: note.note,
    message,
    status: extra.status || "confirmed",
    transaction_signature: extra.transaction_signature ?? null,
    related_transaction_signature: extra.related_transaction_signature ?? null,
    token_mint: extra.token_mint ?? null,
    token_amount: extra.token_amount ?? null,
    usd_value: extra.usd_value ?? null,
    slot: extra.slot ?? null,
    block_time: extra.block_time ?? null,
  }).catch(() => {});
}

export async function writeOnchainNote(input: WriteNoteInput) {
  const cleaned = sanitizeNote(input.note);
  if (!cleaned.ok) return { ok: false as const, status: 400, error: cleaned.error };
  if (!supabaseAdmin()) {
    return { ok: false as const, status: 503, error: "Notes cannot be stored (missing service role)." };
  }
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
  const key = isIdempotencyKey(input.idempotencyKey) ? input.idempotencyKey : randomUUID();
  const existing = await findNoteByIdempotency(key);
  if (existing) {
    if (existing.memo_status === "confirmed" && flags.autoBurnEnabled) {
      void resumeNote(existing.id);
    }
    return { ok: true as const, status: 200, idempotent: true, note: notePublic(existing) };
  }

  const inserted = await insertNote({
    idempotency_key: key,
    source: input.source,
    wallet: input.wallet || null,
    note: cleaned.note,
    memo_text: buildMemoText(cleaned.note),
    memo_status: "pending",
    buy_status: "idle",
    burn_status: "idle",
  });
  const note = asNote(inserted.data);
  if (!inserted.ok || !note) {
    const again = await findNoteByIdempotency(key);
    if (again) return { ok: true as const, status: 200, idempotent: true, note: notePublic(again) };
    return { ok: false as const, status: 502, error: inserted.error || "Could not create the note record." };
  }

  try {
    const memo = await sendMemo(note.memo_text);
    const patched = await patchNote(note.id, {
      memo_status: "confirmed",
      memo_tx: memo.signature,
      slot: memo.slot,
      memo_confirmed_at: memo.blockTime || new Date().toISOString(),
      error: null,
    });
    const confirmed = asNote(patched.data) || { ...note, memo_status: "confirmed" as const, memo_tx: memo.signature };
    await publish(confirmed, "MEMO_CREATED", `New on-chain memo recorded`, {
      transaction_signature: memo.signature,
      slot: memo.slot,
      block_time: memo.blockTime,
    });
    await publish(confirmed, "TRANSACTION_CONFIRMED", `Memo confirmed on Solana`, {
      transaction_signature: memo.signature,
      related_transaction_signature: memo.signature,
    });
    if (flags.autoBurnEnabled) void resumeNote(confirmed.id);
    return { ok: true as const, status: 201, idempotent: false, note: notePublic(confirmed) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await patchNote(note.id, { memo_status: "failed", error: message.slice(0, 400) });
    await publish(note, "TRANSACTION_FAILED", `Memo broadcast failed`, { status: "failed" });
    return { ok: false as const, status: 502, error: "Memo was not confirmed on Solana." };
  }
}

export async function resumeNote(id: string) {
  const flags = await effectiveFlags();
  const note = await findNoteById(id);
  if (!note || note.memo_status !== "confirmed") return note;
  if (!flags.autoBurnEnabled) return note;

  const spend = await dailySpend();
  if (spend.burnUsd >= flags.maxDailyBurnUsd) {
    await patchNote(id, { error: "Daily $ORBITX buy/burn USD limit reached." });
    return findNoteById(id);
  }
  if (spend.sol >= flags.maxDailySolSpend) {
    await patchNote(id, { error: "Daily SOL spend limit reached." });
    return findNoteById(id);
  }

  let current = note;
  if (current.buy_status !== "confirmed") {
    if (current.buy_tx) {
      await patchNote(id, { buy_status: "confirmed", buy_confirmed_at: current.buy_confirmed_at || new Date().toISOString() });
    } else {
      await patchNote(id, { buy_status: "pending", error: null });
      try {
        const buy = await buyOrbitxForNote();
        await patchNote(id, {
          buy_status: "confirmed",
          buy_tx: buy.tx.signature,
          token_amount: buy.tokenAmount,
          usd_value: buy.usdValue,
          sol_spent: buy.solSpent,
          price_usd: buy.priceUsd,
          buy_confirmed_at: buy.tx.blockTime,
          error: null,
        });
        current = (await findNoteById(id)) || current;
        await publish(current, "ORBITX_PURCHASE", `$ORBITX purchased`, {
          transaction_signature: buy.tx.signature,
          related_transaction_signature: current.memo_tx,
          token_mint: ORBITX_MINT,
          token_amount: buy.tokenAmount,
          usd_value: buy.usdValue,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        await patchNote(id, { buy_status: "failed", error: message.slice(0, 400) });
        await publish(current, "TRANSACTION_FAILED", `ORBITX purchase failed`, {
          status: "failed",
          related_transaction_signature: current.memo_tx,
        });
        return findNoteById(id);
      }
    }
  }

  current = (await findNoteById(id)) || current;
  if (current.buy_status !== "confirmed") return current;
  if (current.burn_status === "confirmed" && current.burn_tx) return current;

  await patchNote(id, { burn_status: "pending" });
  try {
    const burn = await burnOrbitx(Number(current.token_amount || 0) || undefined);
    await patchNote(id, {
      burn_status: "confirmed",
      burn_tx: burn.tx.signature,
      token_amount: burn.tokenAmount,
      burn_confirmed_at: burn.tx.blockTime,
      error: null,
    });
    current = (await findNoteById(id)) || current;
    await publish(current, "ORBITX_BURN", `$ORBITX burned permanently`, {
      transaction_signature: burn.tx.signature,
      related_transaction_signature: current.buy_tx,
      token_mint: ORBITX_MINT,
      token_amount: burn.tokenAmount,
      usd_value: current.usd_value,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await patchNote(id, { burn_status: "failed", error: message.slice(0, 400) });
    await publish(current, "TRANSACTION_FAILED", `ORBITX burn failed`, {
      status: "failed",
      related_transaction_signature: current.buy_tx,
    });
  }
  return findNoteById(id);
}

export async function recoverPending(limit = 6) {
  const rows = await pendingRecoveries(limit);
  const out = [];
  for (const row of rows) {
    out.push(await resumeNote(row.id));
  }
  return out;
}

export async function getNoteBySignature(signature: string) {
  const local = await findNoteByMemoTx(signature);
  const chain = await readMemoFromSignature(signature);
  return { local: local ? notePublic(local) : null, chain };
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
  const [rows, stats] = await Promise.all([listActivity({ eventType, limit, offset }), activityStats()]);
  return {
    ok: true,
    items: rows.data || [],
    stats,
    limit,
    offset,
    nextOffset: offset + limit,
  };
}

export async function notesIndex(input: { wallet?: string; search?: string; limit?: number; offset?: number }) {
  const limit = Math.min(50, Math.max(1, Number(input.limit || 20)));
  const offset = Math.max(0, Number(input.offset || 0));
  const res = await listNotes({ wallet: input.wallet, search: input.search, limit, offset });
  return { ok: true, items: (res.data || []).map(notePublic), limit, offset };
}

export async function walletStatus() {
  const flags = await effectiveFlags();
  const [balances, stats, spend, price] = await Promise.all([
    serviceWalletReady()
      ? serviceBalances().catch(() => ({ sol: 0, orbitx: 0, wallet: servicePublicAddress() }))
      : Promise.resolve({ sol: 0, orbitx: 0, wallet: servicePublicAddress() }),
    activityStats(),
    dailySpend(),
    orbitxMarketPrice().catch(() => null),
  ]);
  let fee: number | null = null;
  try {
    const sized = await sizeNoteBurn().catch(() => null);
    fee = sized?.solAmount ?? null;
  } catch {
    fee = null;
  }
  return {
    ok: true,
    wallet: balances.wallet,
    sol: balances.sol,
    orbitx: balances.orbitx,
    mint: ORBITX_MINT,
    network: "solana-mainnet",
    ready: serviceWalletReady(),
    notesEnabled: flags.notesEnabled,
    autoBurnEnabled: flags.autoBurnEnabled,
    noteBurnUsd: NOTE_BURN_USD,
    maxDailyBurnUsd: flags.maxDailyBurnUsd,
    maxDailySolSpend: flags.maxDailySolSpend,
    spentTodayUsd: spend.burnUsd,
    spentTodaySol: spend.sol,
    marketPriceUsd: price?.priceUsd ?? null,
    estimatedSolForNote: fee,
    stats,
    scanWallet: `https://solscan.io/account/${balances.wallet}`,
  };
}

export async function adminBurnOrbitx(amountUi?: number) {
  if (!serviceWalletReady()) return { ok: false as const, error: "Service wallet is not configured." };
  const flags = await effectiveFlags();
  if (!flags.autoBurnEnabled) return { ok: false as const, error: "Auto-burn is paused." };
  const burn = await burnOrbitx(amountUi);
  await insertActivity({
    event_type: "ORBITX_BURN",
    transaction_signature: burn.tx.signature,
    wallet_address: servicePublicAddress(),
    token_mint: ORBITX_MINT,
    token_amount: burn.tokenAmount,
    usd_value: NOTE_BURN_USD,
    message: "Admin $ORBITX burn",
    status: "confirmed",
    note_preview: null,
  });
  return { ok: true as const, signature: burn.tx.signature, explorerUrl: scanUrl(burn.tx.signature), tokenAmount: burn.tokenAmount };
}

export { notePublic, scanUrl };
