-- SQL index for on-chain notes (no JWT). Chain remains source of truth.
-- Connect with DATABASE_URL / POSTGRES_URL / POSTGRES_URL_NON_POOLING.

create table if not exists public.apogee_onchain_snapshot (
  id integer primary key default 1 check (id = 1),
  wallet text not null,
  sol numeric,
  orbitx numeric,
  price_usd numeric,
  estimated_sol_for_note numeric,
  ready boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.apogee_onchain_activity add column if not exists memo text;

create unique index if not exists apogee_onchain_notes_memo_tx_key
  on public.apogee_onchain_notes (memo_tx);

insert into public.apogee_onchain_snapshot (id, wallet)
values (1, '2kYK8wfZt2A1BxsYQtGMdcZ3K3BovpFwZg5gWJ46HvEj')
on conflict (id) do nothing;
