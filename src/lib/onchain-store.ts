import { asRowArray, sbInsert, sbRest, supabaseAdmin } from "./supabase-admin";
import {
  type ActivityStatus,
  type OnchainEventType,
  type OpStatus,
  defaultDailyBurnUsd,
  defaultDailySolSpend,
  autoBurnEnabledByEnv,
  notesEnabledByEnv,
  scanUrl,
} from "./onchain-config";
import { previewNote } from "./onchain-memo";

export type NoteRow = {
  id: string;
  idempotency_key: string;
  source: string;
  wallet: string | null;
  note: string;
  memo_text: string;
  memo_status: OpStatus;
  memo_tx: string | null;
  buy_status: OpStatus;
  buy_tx: string | null;
  burn_status: OpStatus;
  burn_tx: string | null;
  token_amount: number | null;
  usd_value: number | null;
  sol_spent: number | null;
  price_usd: number | null;
  slot: number | null;
  error: string | null;
  created_at: string;
  memo_confirmed_at: string | null;
  buy_confirmed_at: string | null;
  burn_confirmed_at: string | null;
};

export type ActivityRow = {
  id: string;
  event_type: OnchainEventType;
  user_id: string | null;
  note_id: string | null;
  burn_operation_id: string | null;
  transaction_signature: string | null;
  related_transaction_signature: string | null;
  wallet_address: string | null;
  token_mint: string | null;
  token_amount: number | null;
  usd_value: number | null;
  note_preview: string | null;
  message: string;
  status: ActivityStatus;
  slot: number | null;
  block_time: string | null;
  created_at: string;
  confirmed_at: string | null;
  solscan_url: string | null;
};

export type SettingsRow = {
  notes_enabled: boolean;
  auto_burn_enabled: boolean;
  max_daily_burn_usd: number;
  max_daily_sol_spend: number;
  paused_reason: string | null;
};

export async function loadSettings(): Promise<SettingsRow> {
  const fallback: SettingsRow = {
    notes_enabled: true,
    auto_burn_enabled: true,
    max_daily_burn_usd: defaultDailyBurnUsd(),
    max_daily_sol_spend: defaultDailySolSpend(),
    paused_reason: null,
  };
  if (!supabaseAdmin()) return fallback;
  const res = await sbRest<SettingsRow[]>("apogee_onchain_settings?id=eq.1&select=*");
  const row = asRowArray<SettingsRow>(res.data)[0];
  if (!row) return fallback;
  return {
    notes_enabled: row.notes_enabled,
    auto_burn_enabled: row.auto_burn_enabled,
    max_daily_burn_usd: Number(row.max_daily_burn_usd ?? fallback.max_daily_burn_usd),
    max_daily_sol_spend: Number(row.max_daily_sol_spend ?? fallback.max_daily_sol_spend),
    paused_reason: row.paused_reason,
  };
}

export async function effectiveFlags() {
  const settings = await loadSettings();
  const envNotes = notesEnabledByEnv();
  const envBurn = autoBurnEnabledByEnv();
  return {
    notesEnabled: envNotes == null ? settings.notes_enabled : envNotes && settings.notes_enabled,
    autoBurnEnabled: envBurn == null ? settings.auto_burn_enabled : envBurn && settings.auto_burn_enabled,
    maxDailyBurnUsd: defaultDailyBurnUsd() || settings.max_daily_burn_usd,
    maxDailySolSpend: defaultDailySolSpend() || settings.max_daily_sol_spend,
    pausedReason: settings.paused_reason,
    settings,
  };
}

export async function patchSettings(patch: Partial<SettingsRow>) {
  return sbRest("apogee_onchain_settings?id=eq.1", {
    method: "PATCH",
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

export async function findNoteByIdempotency(key: string): Promise<NoteRow | null> {
  const res = await sbRest<NoteRow[]>(`apogee_onchain_notes?idempotency_key=eq.${encodeURIComponent(key)}&select=*`);
  return asRowArray<NoteRow>(res.data)[0] || null;
}

export async function findNoteById(id: string): Promise<NoteRow | null> {
  const res = await sbRest<NoteRow[]>(`apogee_onchain_notes?id=eq.${encodeURIComponent(id)}&select=*`);
  return asRowArray<NoteRow>(res.data)[0] || null;
}

export async function findNoteByMemoTx(signature: string): Promise<NoteRow | null> {
  const res = await sbRest<NoteRow[]>(`apogee_onchain_notes?memo_tx=eq.${encodeURIComponent(signature)}&select=*`);
  return asRowArray<NoteRow>(res.data)[0] || null;
}

export async function insertNote(row: Partial<NoteRow> & { idempotency_key: string; note: string; memo_text: string }) {
  return sbInsert("apogee_onchain_notes", row as Record<string, unknown>);
}

export async function patchNote(id: string, patch: Partial<NoteRow>) {
  return sbRest<NoteRow[]>(`apogee_onchain_notes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function listNotes(input: { wallet?: string; search?: string; limit: number; offset: number }) {
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("order", "created_at.desc");
  params.set("limit", String(input.limit));
  params.set("offset", String(input.offset));
  if (input.wallet) params.set("wallet", `eq.${input.wallet}`);
  if (input.search) params.set("note", `ilike.*${input.search.replace(/[,()]/g, "")}*`);
  return sbRest<NoteRow[]>(`apogee_onchain_notes?${params.toString()}`);
}

export async function insertActivity(row: {
  event_type: OnchainEventType;
  note_id?: string | null;
  transaction_signature?: string | null;
  related_transaction_signature?: string | null;
  wallet_address?: string | null;
  token_mint?: string | null;
  token_amount?: number | null;
  usd_value?: number | null;
  note_preview?: string | null;
  message: string;
  status: ActivityStatus;
  slot?: number | null;
  block_time?: string | null;
}) {
  const confirmed = row.status === "confirmed" ? new Date().toISOString() : null;
  return sbInsert("apogee_onchain_activity", {
    ...row,
    confirmed_at: confirmed,
    solscan_url: row.transaction_signature ? scanUrl(row.transaction_signature) : null,
    note_preview: row.note_preview ? previewNote(row.note_preview, 200) : null,
  });
}

export async function listActivity(input: {
  eventType?: string;
  limit: number;
  offset: number;
  includeFailed?: boolean;
}) {
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("order", "created_at.desc");
  params.set("limit", String(input.limit));
  params.set("offset", String(input.offset));
  if (input.eventType && input.eventType !== "ALL") params.set("event_type", `eq.${input.eventType}`);
  if (!input.includeFailed) params.set("status", "in.(confirmed,pending)");
  return sbRest<ActivityRow[]>(`apogee_onchain_activity?${params.toString()}`);
}

export async function activityStats() {
  const res = await sbRest<unknown>("rpc/apogee_onchain_stats", { method: "POST", body: "{}" });
  if (res.ok && res.data && typeof res.data === "object") return res.data as Record<string, number>;
  return {
    totalBurnedUsd: 0,
    orbitxBurned: 0,
    totalMemos: 0,
    totalBuys: 0,
    solSpent: 0,
    solSpentNative: 0,
  };
}

export async function dailySpend() {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const buys = await sbRest<Array<{ usd_value?: number; sol_spent?: number }>>(
    `apogee_onchain_notes?buy_status=eq.confirmed&buy_confirmed_at=gte.${since}&select=usd_value,sol_spent`,
  );
  const rows = asRowArray<{ usd_value?: number; sol_spent?: number }>(buys.data);
  return {
    burnUsd: rows.reduce((s, r) => s + Number(r.usd_value || 0), 0),
    sol: rows.reduce((s, r) => s + Number(r.sol_spent || 0), 0),
  };
}

export async function pendingRecoveries(limit = 8) {
  const res = await sbRest<NoteRow[]>(
    `apogee_onchain_notes?memo_status=eq.confirmed&or=(buy_status.eq.idle,buy_status.eq.pending,buy_status.eq.failed,burn_status.eq.idle,burn_status.eq.pending,burn_status.eq.failed)&order=created_at.asc&limit=${limit}&select=*`,
  );
  return asRowArray<NoteRow>(res.data);
}

export function notePublic(note: NoteRow) {
  return {
    id: note.id,
    note: note.note,
    memo: note.memo_text,
    source: note.source,
    wallet: note.wallet,
    memoStatus: note.memo_status,
    buyStatus: note.buy_status,
    burnStatus: note.burn_status,
    memoTx: note.memo_tx,
    buyTx: note.buy_tx,
    burnTx: note.burn_tx,
    memoUrl: note.memo_tx ? scanUrl(note.memo_tx) : null,
    buyUrl: note.buy_tx ? scanUrl(note.buy_tx) : null,
    burnUrl: note.burn_tx ? scanUrl(note.burn_tx) : null,
    tokenAmount: note.token_amount,
    usdValue: note.usd_value,
    solSpent: note.sol_spent,
    priceUsd: note.price_usd,
    createdAt: note.created_at,
    memoConfirmedAt: note.memo_confirmed_at,
    buyConfirmedAt: note.buy_confirmed_at,
    burnConfirmedAt: note.burn_confirmed_at,
    error: note.error,
  };
}
