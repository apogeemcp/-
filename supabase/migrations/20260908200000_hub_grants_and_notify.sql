-- Harden grants: RLS with no policies still leaves table GRANTs on anon.
-- Service role remains the only writer for payment/access/burn rows.

do $$
declare t text;
begin
  foreach t in array array[
    'apogee_usage',
    'apogee_scan_log',
    'apogee_partner_requests',
    'apogee_auth_nonces',
    'apogee_wallet_identities',
    'apogee_developer_profiles',
    'apogee_mcp_purchases',
    'apogee_access_grants',
    'apogee_burn_records',
    'apogee_mcp_credentials',
    'apogee_support_requests',
    'apogee_audit_events',
    'apogee_product_events',
    'apogee_notifications'
  ]
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('revoke all on table public.%I from public, anon, authenticated', t);
      execute format('grant all on table public.%I to service_role', t);
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant execute on function public.apogee_usage_summary() to anon, authenticated, service_role;

create or replace function public.apogee_expire_grants()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update public.apogee_access_grants
  set status = 'expired'
  where status = 'active'
    and lifetime = false
    and expires_at is not null
    and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.apogee_expire_grants() from public, anon, authenticated;
grant execute on function public.apogee_expire_grants() to service_role;

create or replace function public.apogee_notify(
  p_wallet text,
  p_kind text,
  p_title text,
  p_body text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  if p_wallet is null or length(p_wallet) < 4 then
    return null;
  end if;
  insert into public.apogee_notifications (wallet, kind, title, body)
  values (p_wallet, p_kind, p_title, p_body)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.apogee_notify(text, text, text, text) from public, anon, authenticated;
grant execute on function public.apogee_notify(text, text, text, text) to service_role;

create or replace function public.apogee_on_grant_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and new.wallet is not null then
    insert into public.apogee_notifications (wallet, kind, title, body)
    values (
      new.wallet,
      'mcp_activated',
      'MCP access activated',
      case when new.lifetime then 'Lifetime MCP access is active.'
           else 'MCP access is active until ' || coalesce(new.expires_at::text, 'unknown') end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists apogee_access_grants_notify on public.apogee_access_grants;
create trigger apogee_access_grants_notify
after insert on public.apogee_access_grants
for each row execute function public.apogee_on_grant_notify();

create or replace function public.apogee_on_purchase_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' and new.wallet is not null then
    insert into public.apogee_notifications (wallet, kind, title, body)
    values (
      new.wallet,
      'purchase_successful',
      'MCP purchase confirmed',
      coalesce(new.plan_label, new.plan_id) || ' · $' || new.price_usd::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists apogee_mcp_purchases_notify on public.apogee_mcp_purchases;
create trigger apogee_mcp_purchases_notify
after insert or update of status on public.apogee_mcp_purchases
for each row execute function public.apogee_on_purchase_notify();

create or replace function public.apogee_on_burn_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verified = true and new.burn_tx is not null and new.wallet is not null then
    insert into public.apogee_notifications (wallet, kind, title, body)
    values (
      new.wallet,
      'burn_completed',
      '$ORBITX burn recorded',
      'Verified burn transaction stored.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists apogee_burn_records_notify on public.apogee_burn_records;
create trigger apogee_burn_records_notify
after insert or update of verified, burn_tx on public.apogee_burn_records
for each row execute function public.apogee_on_burn_notify();
