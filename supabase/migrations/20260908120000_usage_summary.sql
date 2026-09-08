-- Aggregate MCP/API usage for the public Usage page. No row-level query exposure.
create or replace function public.apogee_usage_summary()
returns table(tool text, calls bigint, last_seen timestamptz)
language sql
security definer
set search_path = public
as $$
  select tool, count(*)::bigint as calls, max(created_at) as last_seen
  from public.apogee_usage
  group by tool
  order by count(*) desc
  limit 80;
$$;

revoke all on function public.apogee_usage_summary() from public;
grant execute on function public.apogee_usage_summary() to anon, authenticated, service_role;
