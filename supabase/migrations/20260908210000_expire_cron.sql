-- Expire rental grants on a schedule. Trigger functions stay internal.
-- pg_cron is already enabled on this project.

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

  delete from public.apogee_auth_nonces
  where expires_at < now() - interval '1 day';

  return n;
end;
$$;

revoke all on function public.apogee_expire_grants() from public, anon, authenticated;
grant execute on function public.apogee_expire_grants() to service_role;

revoke all on function public.apogee_on_grant_notify() from public, anon, authenticated;
revoke all on function public.apogee_on_purchase_notify() from public, anon, authenticated;
revoke all on function public.apogee_on_burn_notify() from public, anon, authenticated;

do $$
declare jid bigint;
begin
  for jid in select jobid from cron.job where jobname = 'apogee-expire-grants' loop
    perform cron.unschedule(jid);
  end loop;
  perform cron.schedule(
    'apogee-expire-grants',
    '15 * * * *',
    $cron$select public.apogee_expire_grants()$cron$
  );
end $$;
