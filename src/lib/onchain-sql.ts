import { defaultDailyBurnUsd, defaultDailySolSpend, ORBITX_MINT, SERVICE_WALLET_PUBLIC, scanUrl } from "./onchain-config";
import {
  activityEventsForNote,
  mergeAssembled,
  recomputeStats,
  type AssembledChain,
  type ChainActivity,
  type PublicNote,
} from "./onchain-chain-index";
import { pgQuery, sqlConfigured } from "./pg-pool";

export type SqlSettingsRow = {
  notes_enabled: boolean;
  auto_burn_enabled: boolean;
  max_daily_burn_usd: number;
  max_daily_sol_spend: number;
  paused_reason: string | null;
};

export { sqlConfigured };

let schemaReady: Promise<boolean> | null = null;

const SCHEMA_STATEMENTS = [
  `create table if not exists apogee_onchain_notes (
    id uuid primary key default gen_random_uuid(),
    idempotency_key text not null unique,
    source text not null default 'chain',
    wallet text,
    note text not null,
    memo_text text not null,
    memo_status text not null default 'pending',
    memo_tx text unique,
    buy_status text not null default 'idle',
    buy_tx text,
    burn_status text not null default 'idle',
    burn_tx text,
    token_amount numeric,
    usd_value numeric,
    sol_spent numeric,
    price_usd numeric,
    slot bigint,
    error text,
    created_at timestamptz not null default now(),
    memo_confirmed_at timestamptz,
    buy_confirmed_at timestamptz,
    burn_confirmed_at timestamptz
  )`,
  `create unique index if not exists apogee_onchain_notes_memo_tx_key on apogee_onchain_notes (memo_tx)`,
  `create index if not exists apogee_onchain_notes_created_idx on apogee_onchain_notes (created_at desc)`,
  `create table if not exists apogee_onchain_activity (
    id uuid primary key default gen_random_uuid(),
    event_type text not null,
    user_id text,
    note_id uuid,
    burn_operation_id uuid,
    transaction_signature text,
    related_transaction_signature text,
    wallet_address text,
    token_mint text,
    token_amount numeric,
    usd_value numeric,
    note_preview text,
    message text not null,
    status text not null default 'pending',
    slot bigint,
    block_time timestamptz,
    created_at timestamptz not null default now(),
    confirmed_at timestamptz,
    solscan_url text,
    memo text
  )`,
  `alter table apogee_onchain_activity add column if not exists memo text`,
  `create index if not exists apogee_onchain_activity_created_idx on apogee_onchain_activity (created_at desc)`,
  `create unique index if not exists apogee_onchain_activity_sig_type_uq
    on apogee_onchain_activity (event_type, transaction_signature)
    where transaction_signature is not null`,
  `create table if not exists apogee_onchain_settings (
    id integer primary key default 1 check (id = 1),
    notes_enabled boolean not null default true,
    auto_burn_enabled boolean not null default true,
    max_daily_burn_usd numeric not null default 50,
    max_daily_sol_spend numeric not null default 1,
    paused_reason text,
    updated_at timestamptz not null default now()
  )`,
  `insert into apogee_onchain_settings (id) values (1) on conflict (id) do nothing`,
  `create table if not exists apogee_onchain_snapshot (
    id integer primary key default 1 check (id = 1),
    wallet text not null,
    sol numeric,
    orbitx numeric,
    price_usd numeric,
    estimated_sol_for_note numeric,
    ready boolean not null default false,
    updated_at timestamptz not null default now()
  )`,
];

export async function ensureSchema(): Promise<boolean> {
  if (!sqlConfigured()) return false;
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const sql of SCHEMA_STATEMENTS) {
        const res = await pgQuery(sql);
        if (!res.ok) {
          schemaReady = null;
          return false;
        }
      }
      return true;
    })();
  }
  return schemaReady;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function iso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isoRequired(value: unknown, fallback = new Date().toISOString()): string {
  return iso(value) || fallback;
}

type NoteSqlRow = Record<string, unknown>;
type ActivitySqlRow = Record<string, unknown>;

export function publicNoteFromSqlRow(row: NoteSqlRow): PublicNote | null {
  const memoTx = row.memo_tx ? String(row.memo_tx) : null;
  if (!memoTx) return null;
  const note = String(row.note || "");
  const memo = String(row.memo_text || "");
  const createdAt = isoRequired(row.created_at);
  return {
    id: memoTx,
    note,
    memo,
    source: String(row.source || "chain"),
    wallet: String(row.wallet || SERVICE_WALLET_PUBLIC),
    memoStatus: (String(row.memo_status || "confirmed") as PublicNote["memoStatus"]),
    buyStatus: (String(row.buy_status || "idle") as PublicNote["buyStatus"]),
    burnStatus: (String(row.burn_status || "idle") as PublicNote["burnStatus"]),
    memoTx,
    buyTx: row.buy_tx ? String(row.buy_tx) : null,
    burnTx: row.burn_tx ? String(row.burn_tx) : null,
    memoUrl: memoTx ? scanUrl(memoTx) : null,
    buyUrl: row.buy_tx ? scanUrl(String(row.buy_tx)) : null,
    burnUrl: row.burn_tx ? scanUrl(String(row.burn_tx)) : null,
    tokenAmount: num(row.token_amount),
    usdValue: num(row.usd_value),
    solSpent: num(row.sol_spent),
    priceUsd: num(row.price_usd),
    createdAt,
    memoConfirmedAt: iso(row.memo_confirmed_at),
    buyConfirmedAt: iso(row.buy_confirmed_at),
    burnConfirmedAt: iso(row.burn_confirmed_at),
    error: row.error ? String(row.error) : null,
  };
}

export function activityFromSqlRow(row: ActivitySqlRow): ChainActivity {
  const eventType = String(row.event_type || "TRANSACTION_CONFIRMED");
  const signature = row.transaction_signature ? String(row.transaction_signature) : null;
  const created = isoRequired(row.created_at);
  return {
    id: signature ? `${eventType}:${signature}` : String(row.id || `${eventType}:${created}`),
    event_type: eventType,
    message: String(row.message || ""),
    note_preview: row.note_preview ? String(row.note_preview) : null,
    token_amount: num(row.token_amount),
    usd_value: num(row.usd_value),
    status: String(row.status || "confirmed"),
    transaction_signature: signature,
    related_transaction_signature: row.related_transaction_signature ? String(row.related_transaction_signature) : null,
    solscan_url: row.solscan_url ? String(row.solscan_url) : signature ? scanUrl(signature) : null,
    memo: row.memo ? String(row.memo) : null,
    created_at: created,
    confirmed_at: iso(row.confirmed_at),
    slot: num(row.slot),
  };
}

export async function persistNote(note: PublicNote): Promise<boolean> {
  if (!note.memoTx) return false;
  if (!(await ensureSchema())) return false;
  const res = await pgQuery(
    `insert into apogee_onchain_notes (
      idempotency_key, source, wallet, note, memo_text,
      memo_status, memo_tx, buy_status, buy_tx, burn_status, burn_tx,
      token_amount, usd_value, sol_spent, price_usd, error,
      created_at, memo_confirmed_at, buy_confirmed_at, burn_confirmed_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
    )
    on conflict (memo_tx) do update set
      note = excluded.note,
      memo_text = excluded.memo_text,
      memo_status = excluded.memo_status,
      buy_status = excluded.buy_status,
      buy_tx = coalesce(excluded.buy_tx, apogee_onchain_notes.buy_tx),
      burn_status = excluded.burn_status,
      burn_tx = coalesce(excluded.burn_tx, apogee_onchain_notes.burn_tx),
      token_amount = coalesce(excluded.token_amount, apogee_onchain_notes.token_amount),
      usd_value = coalesce(excluded.usd_value, apogee_onchain_notes.usd_value),
      sol_spent = coalesce(excluded.sol_spent, apogee_onchain_notes.sol_spent),
      price_usd = coalesce(excluded.price_usd, apogee_onchain_notes.price_usd),
      error = excluded.error,
      memo_confirmed_at = coalesce(excluded.memo_confirmed_at, apogee_onchain_notes.memo_confirmed_at),
      buy_confirmed_at = coalesce(excluded.buy_confirmed_at, apogee_onchain_notes.buy_confirmed_at),
      burn_confirmed_at = coalesce(excluded.burn_confirmed_at, apogee_onchain_notes.burn_confirmed_at)`,
    [
      `chain:${note.memoTx}`,
      note.source || "chain",
      note.wallet || SERVICE_WALLET_PUBLIC,
      note.note,
      note.memo,
      note.memoStatus,
      note.memoTx,
      note.buyStatus,
      note.buyTx,
      note.burnStatus,
      note.burnTx,
      note.tokenAmount,
      note.usdValue,
      note.solSpent,
      note.priceUsd,
      note.error,
      note.createdAt,
      note.memoConfirmedAt,
      note.buyConfirmedAt,
      note.burnConfirmedAt,
    ],
  );
  return res.ok;
}

export async function persistActivity(row: ChainActivity): Promise<boolean> {
  if (!row.transaction_signature) return false;
  if (!(await ensureSchema())) return false;
  const existing = await pgQuery<{ id: string }>(
    `select id from apogee_onchain_activity
     where event_type = $1 and transaction_signature = $2
     limit 1`,
    [row.event_type, row.transaction_signature],
  );
  if (existing.ok && existing.rows[0]?.id) {
    const upd = await pgQuery(
      `update apogee_onchain_activity set
        related_transaction_signature = coalesce($2, related_transaction_signature),
        wallet_address = coalesce($3, wallet_address),
        token_mint = coalesce($4, token_mint),
        token_amount = coalesce($5, token_amount),
        usd_value = coalesce($6, usd_value),
        note_preview = coalesce($7, note_preview),
        message = $8,
        status = $9,
        slot = coalesce($10, slot),
        block_time = coalesce($11, block_time),
        confirmed_at = coalesce($12, confirmed_at),
        solscan_url = coalesce($13, solscan_url),
        memo = coalesce($14, memo)
       where id = $1`,
      [
        existing.rows[0].id,
        row.related_transaction_signature,
        SERVICE_WALLET_PUBLIC,
        ORBITX_MINT,
        row.token_amount,
        row.usd_value,
        row.note_preview,
        row.message,
        row.status,
        row.slot,
        row.created_at,
        row.confirmed_at,
        row.solscan_url,
        row.memo,
      ],
    );
    return upd.ok;
  }
  const ins = await pgQuery(
    `insert into apogee_onchain_activity (
      event_type, transaction_signature, related_transaction_signature,
      wallet_address, token_mint, token_amount, usd_value, note_preview,
      message, status, slot, block_time, created_at, confirmed_at, solscan_url, memo
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      row.event_type,
      row.transaction_signature,
      row.related_transaction_signature,
      SERVICE_WALLET_PUBLIC,
      ORBITX_MINT,
      row.token_amount,
      row.usd_value,
      row.note_preview,
      row.message,
      row.status,
      row.slot,
      row.created_at,
      row.created_at,
      row.confirmed_at,
      row.solscan_url,
      row.memo,
    ],
  );
  return ins.ok;
}

export async function persistNoteBundle(note: PublicNote): Promise<void> {
  await persistNote(note);
  for (const event of activityEventsForNote(note)) {
    await persistActivity(event);
  }
}

export async function persistAssembled(data: AssembledChain): Promise<void> {
  if (!(await ensureSchema())) return;
  for (const note of data.notes) {
    await persistNote(note);
  }
  for (const event of data.activity) {
    await persistActivity(event);
  }
}

export async function loadAssembledFromSql(limit = 80): Promise<AssembledChain | null> {
  if (!(await ensureSchema())) return null;
  const notesRes = await pgQuery(
    `select * from apogee_onchain_notes
     where memo_tx is not null
     order by created_at desc
     limit $1`,
    [limit],
  );
  const actRes = await pgQuery(
    `select * from apogee_onchain_activity
     order by created_at desc
     limit $1`,
    [Math.min(200, limit * 3)],
  );
  if (!notesRes.ok || !actRes.ok) return null;
  const notes = notesRes.rows.map(publicNoteFromSqlRow).filter((n): n is PublicNote => Boolean(n));
  const activity = actRes.rows.map(activityFromSqlRow);
  return mergeAssembled({ notes, activity, stats: recomputeStats(notes, activity) }, null);
}

export async function loadNoteByMemoTx(signature: string): Promise<PublicNote | null> {
  if (!(await ensureSchema())) return null;
  const res = await pgQuery(
    `select * from apogee_onchain_notes
     where memo_tx = $1 or buy_tx = $1 or burn_tx = $1
     limit 1`,
    [signature],
  );
  if (!res.ok) return null;
  return res.rows[0] ? publicNoteFromSqlRow(res.rows[0]) : null;
}

export type WalletSnapshot = {
  wallet: string;
  sol: number;
  orbitx: number;
  priceUsd: number | null;
  estimatedSolForNote: number | null;
  ready: boolean;
  updatedAtMs: number;
};

export async function loadWalletSnapshot(): Promise<WalletSnapshot | null> {
  if (!(await ensureSchema())) return null;
  const res = await pgQuery(
    `select wallet, sol, orbitx, price_usd, estimated_sol_for_note, ready, updated_at
     from apogee_onchain_snapshot where id = 1`,
  );
  if (!res.ok || !res.rows[0]) return null;
  const row = res.rows[0];
  const updated = iso(row.updated_at);
  return {
    wallet: String(row.wallet || SERVICE_WALLET_PUBLIC),
    sol: num(row.sol) ?? 0,
    orbitx: num(row.orbitx) ?? 0,
    priceUsd: num(row.price_usd),
    estimatedSolForNote: num(row.estimated_sol_for_note),
    ready: Boolean(row.ready),
    updatedAtMs: updated ? Date.parse(updated) : 0,
  };
}

export async function saveWalletSnapshot(snap: Omit<WalletSnapshot, "updatedAtMs">): Promise<void> {
  if (!(await ensureSchema())) return;
  await pgQuery(
    `insert into apogee_onchain_snapshot (
      id, wallet, sol, orbitx, price_usd, estimated_sol_for_note, ready, updated_at
    ) values (1,$1,$2,$3,$4,$5,$6,now())
    on conflict (id) do update set
      wallet = excluded.wallet,
      sol = excluded.sol,
      orbitx = excluded.orbitx,
      price_usd = excluded.price_usd,
      estimated_sol_for_note = excluded.estimated_sol_for_note,
      ready = excluded.ready,
      updated_at = now()`,
    [snap.wallet, snap.sol, snap.orbitx, snap.priceUsd, snap.estimatedSolForNote, snap.ready],
  );
}

export async function loadSettingsRow(): Promise<SqlSettingsRow | null> {
  if (!(await ensureSchema())) return null;
  const res = await pgQuery(
    `select notes_enabled, auto_burn_enabled, max_daily_burn_usd, max_daily_sol_spend, paused_reason
     from apogee_onchain_settings where id = 1`,
  );
  if (!res.ok || !res.rows[0]) return null;
  const row = res.rows[0];
  return {
    notes_enabled: Boolean(row.notes_enabled),
    auto_burn_enabled: Boolean(row.auto_burn_enabled),
    max_daily_burn_usd: num(row.max_daily_burn_usd) ?? defaultDailyBurnUsd(),
    max_daily_sol_spend: num(row.max_daily_sol_spend) ?? defaultDailySolSpend(),
    paused_reason: row.paused_reason ? String(row.paused_reason) : null,
  };
}

export async function patchSettingsRow(patch: Partial<SqlSettingsRow>): Promise<{ ok: boolean; error?: string }> {
  if (!(await ensureSchema())) return { ok: false, error: "Postgres is not configured." };
  const current = (await loadSettingsRow()) || {
    notes_enabled: true,
    auto_burn_enabled: true,
    max_daily_burn_usd: defaultDailyBurnUsd(),
    max_daily_sol_spend: defaultDailySolSpend(),
    paused_reason: null,
  };
  const next = { ...current, ...patch };
  const res = await pgQuery(
    `insert into apogee_onchain_settings (
      id, notes_enabled, auto_burn_enabled, max_daily_burn_usd, max_daily_sol_spend, paused_reason, updated_at
    ) values (1,$1,$2,$3,$4,$5,now())
    on conflict (id) do update set
      notes_enabled = excluded.notes_enabled,
      auto_burn_enabled = excluded.auto_burn_enabled,
      max_daily_burn_usd = excluded.max_daily_burn_usd,
      max_daily_sol_spend = excluded.max_daily_sol_spend,
      paused_reason = excluded.paused_reason,
      updated_at = now()`,
    [next.notes_enabled, next.auto_burn_enabled, next.max_daily_burn_usd, next.max_daily_sol_spend, next.paused_reason],
  );
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}
