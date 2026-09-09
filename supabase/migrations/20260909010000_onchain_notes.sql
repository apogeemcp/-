-- On-chain notes + autonomous $ORBITX buy/burn index.
-- Blockchain is authoritative. These tables power the public feed and recovery.
-- No private keys. Service role writes. Anon may read the public activity feed.

create table if not exists public.apogee_onchain_notes (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  source text not null default 'website',
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
);

create index if not exists apogee_onchain_notes_created_idx
  on public.apogee_onchain_notes (created_at desc);
create index if not exists apogee_onchain_notes_wallet_idx
  on public.apogee_onchain_notes (wallet, created_at desc);
create index if not exists apogee_onchain_notes_memo_status_idx
  on public.apogee_onchain_notes (memo_status, buy_status, burn_status);

create table if not exists public.apogee_onchain_activity (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id text,
  note_id uuid references public.apogee_onchain_notes (id),
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
  solscan_url text
);

create index if not exists apogee_onchain_activity_created_idx
  on public.apogee_onchain_activity (created_at desc);
create index if not exists apogee_onchain_activity_type_idx
  on public.apogee_onchain_activity (event_type, status, created_at desc);
create index if not exists apogee_onchain_activity_note_idx
  on public.apogee_onchain_activity (note_id, created_at desc);
create unique index if not exists apogee_onchain_activity_sig_type_uq
  on public.apogee_onchain_activity (event_type, transaction_signature)
  where transaction_signature is not null;

create table if not exists public.apogee_onchain_settings (
  id integer primary key default 1 check (id = 1),
  notes_enabled boolean not null default true,
  auto_burn_enabled boolean not null default true,
  max_daily_burn_usd numeric not null default 50,
  max_daily_sol_spend numeric not null default 1,
  paused_reason text,
  updated_at timestamptz not null default now()
);

insert into public.apogee_onchain_settings (id)
values (1)
on conflict (id) do nothing;

create or replace function public.apogee_onchain_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'totalBurnedUsd', coalesce((
      select sum(usd_value) from public.apogee_onchain_activity
      where event_type = 'ORBITX_BURN' and status = 'confirmed'
    ), 0),
    'orbitxBurned', coalesce((
      select sum(token_amount) from public.apogee_onchain_activity
      where event_type = 'ORBITX_BURN' and status = 'confirmed'
    ), 0),
    'totalMemos', (
      select count(*) from public.apogee_onchain_activity
      where event_type = 'MEMO_CREATED' and status = 'confirmed'
    ),
    'totalBuys', (
      select count(*) from public.apogee_onchain_activity
      where event_type = 'ORBITX_PURCHASE' and status = 'confirmed'
    ),
    'solSpent', coalesce((
      select sum(usd_value) from public.apogee_onchain_notes
      where buy_status = 'confirmed' and sol_spent is not null
    ), 0),
    'solSpentNative', coalesce((
      select sum(sol_spent) from public.apogee_onchain_notes
      where buy_status = 'confirmed'
    ), 0)
  );
$$;

do $$
declare t text;
begin
  foreach t in array array['apogee_onchain_notes', 'apogee_onchain_activity', 'apogee_onchain_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

grant select on table public.apogee_onchain_activity to anon, authenticated;
grant execute on function public.apogee_onchain_stats() to anon, authenticated, service_role;
revoke all on function public.apogee_onchain_stats() from public;

do $$
begin
  execute 'alter publication supabase_realtime add table public.apogee_onchain_activity';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
