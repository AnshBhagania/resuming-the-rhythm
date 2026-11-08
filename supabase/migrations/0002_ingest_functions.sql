-- Participants write through two narrow functions (idempotent: duplicate (session_id, seq) rows are ignored).
-- Direct upserts from anon would need SELECT rights, so these functions are the write path.
create or replace function public.ingest_events(p_rows jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then
    raise exception 'bad batch';
  end if;
  insert into public.events (session_id, pid, seq, t, phase, block, condition, intr, type, data)
  select (r ->> 'session_id')::uuid, left(r ->> 'pid', 16), (r ->> 'seq')::int, (r ->> 't')::float8,
         r ->> 'phase', (r ->> 'block')::smallint, r ->> 'condition', (r ->> 'intr')::smallint,
         left(r ->> 'type', 40), r -> 'data'
  from jsonb_array_elements(p_rows) r
  on conflict (session_id, seq) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.ingest_session(p_row jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.sessions (session_id, pid, order_code, app_version, flags, device)
  values ((p_row ->> 'session_id')::uuid, left(p_row ->> 'pid', 16), p_row ->> 'order_code',
          p_row ->> 'app_version', p_row -> 'flags', p_row -> 'device')
  on conflict (session_id) do nothing;
end $$;

revoke execute on function public.ingest_events(jsonb), public.ingest_session(jsonb) from public;
grant execute on function public.ingest_events(jsonb), public.ingest_session(jsonb) to anon, authenticated;

-- Applied on the project alongside this file: grant select (session_id, seq) on public.events to anon;
-- NOTE (open item): the direct anon insert policies from 0001 are still in place; dropping them is optional hardening.
