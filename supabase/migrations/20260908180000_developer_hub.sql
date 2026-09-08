-- Developer hub: identity, quotes, grants, burns, support, audit.
-- Service role writes only. RLS on with no public policies.
-- Grants and burn verification_status must never be writable by anon.

create table if not exists public.apogee_auth_nonces (
  nonce text primary key,
  address text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists apogee_auth_nonces_address_idx on public.apogee_auth_nonces (address);
create index if not exists apogee_auth_nonces_expires_idx on public.apogee_auth_nonces (expires_at);

create table if not exists public.apogee_wallet_identities (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  chain text not null default 'eip155',
  wallet_type text not null default 'phantom-ethereum',
  verified boolean not null default false,
  verified_at timestamptz,
  last_used timestamptz,
  created_at timestamptz not null default now(),
  unique (address, chain)
);

create index if not exists apogee_wallet_identities_address_idx on public.apogee_wallet_identities (address);

create table if not exists public.apogee_developer_profiles (
  id uuid primary key default gen_random_uuid(),
  primary_wallet text not null unique,
  role text not null default 'developer',
  display_name text,
  username text,
  bio text,
  last_login timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.apogee_mcp_purchases (
  id uuid primary key default gen_random_uuid(),
  wallet text,
  plan_id text not null,
  plan_label text,
  kind text,
  price_usd numeric not null,
  burn_usd numeric not null,
  ops_usd numeric not null,
  status text not null default 'quoted',
  verification_status text not null default 'unverified',
  tx_signature text,
  chain text,
  source text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists apogee_mcp_purchases_wallet_idx on public.apogee_mcp_purchases (wallet, created_at desc);
create index if not exists apogee_mcp_purchases_status_idx on public.apogee_mcp_purchases (status);

create table if not exists public.apogee_access_grants (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  purchase_id uuid references public.apogee_mcp_purchases (id),
  plan_id text not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  lifetime boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists apogee_access_grants_wallet_idx on public.apogee_access_grants (wallet, created_at desc);

create table if not exists public.apogee_burn_records (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references public.apogee_mcp_purchases (id),
  wallet text,
  allocation_usd numeric not null,
  burn_amount numeric,
  buy_tx text,
  burn_tx text,
  chain text,
  status text not null default 'pending',
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists apogee_burn_records_wallet_idx on public.apogee_burn_records (wallet, created_at desc);
create index if not exists apogee_burn_records_verified_idx on public.apogee_burn_records (verified);

create table if not exists public.apogee_mcp_credentials (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  label text,
  prefix text not null,
  secret_hash text not null,
  status text not null default 'active',
  permissions jsonb,
  last_used timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists apogee_mcp_credentials_wallet_idx on public.apogee_mcp_credentials (wallet);

create table if not exists public.apogee_support_requests (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  contact text not null,
  body text not null,
  wallet text,
  ip_hash text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists apogee_support_requests_created_idx on public.apogee_support_requests (created_at desc);

create table if not exists public.apogee_audit_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists apogee_audit_events_kind_idx on public.apogee_audit_events (kind, created_at desc);

create table if not exists public.apogee_product_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  wallet text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists apogee_product_events_event_idx on public.apogee_product_events (event, created_at desc);

create table if not exists public.apogee_notifications (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  kind text not null,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists apogee_notifications_wallet_idx on public.apogee_notifications (wallet, created_at desc);

alter table public.apogee_auth_nonces enable row level security;
alter table public.apogee_wallet_identities enable row level security;
alter table public.apogee_developer_profiles enable row level security;
alter table public.apogee_mcp_purchases enable row level security;
alter table public.apogee_access_grants enable row level security;
alter table public.apogee_burn_records enable row level security;
alter table public.apogee_mcp_credentials enable row level security;
alter table public.apogee_support_requests enable row level security;
alter table public.apogee_audit_events enable row level security;
alter table public.apogee_product_events enable row level security;
alter table public.apogee_notifications enable row level security;
