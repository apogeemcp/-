-- Partnership intake. Service role writes; no public policies (RLS on).
create table if not exists public.apogee_partner_requests (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  website text,
  contact text not null,
  use_case text not null,
  expected_usage text,
  integration_type text,
  requested_tools text,
  extra text,
  ip_hash text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists apogee_partner_requests_created_at_idx
  on public.apogee_partner_requests (created_at desc);

create index if not exists apogee_partner_requests_status_idx
  on public.apogee_partner_requests (status);

alter table public.apogee_partner_requests enable row level security;
