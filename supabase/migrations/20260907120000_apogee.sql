-- Apogee anonymous API housing (no auth). Service role writes; no public policies.
create table if not exists public.apogee_usage (
  id bigserial primary key,
  tool text not null,
  query text,
  ok boolean,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists apogee_usage_created_at_idx on public.apogee_usage (created_at desc);
create index if not exists apogee_usage_tool_idx on public.apogee_usage (tool);

create table if not exists public.apogee_scan_log (
  id bigserial primary key,
  address text,
  symbol text,
  name text,
  score int,
  verdict text,
  price_usd numeric,
  liquidity_usd numeric,
  created_at timestamptz not null default now()
);

create index if not exists apogee_scan_log_created_at_idx on public.apogee_scan_log (created_at desc);

alter table public.apogee_usage enable row level security;
alter table public.apogee_scan_log enable row level security;
