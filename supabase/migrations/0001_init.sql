-- Resuming the Rhythm: schema, access rules, Spotify account pool.
-- Participants (anon) can only INSERT sessions/events. Admins (allow-listed emails, signed in) can read.
-- Spotify refresh tokens are never readable by any client; only Edge Functions (service role) touch them.

create table public.sessions (
  session_id uuid primary key,
  pid text not null check (char_length(pid) <= 16),
  order_code text,
  started_at timestamptz not null default now(),
  app_version text,
  flags jsonb,
  device jsonb,
  spotify_label text
);

create table public.events (
  id bigserial primary key,
  session_id uuid not null,
  pid text not null check (char_length(pid) <= 16),
  seq integer not null,
  t double precision not null,
  phase text,
  block smallint,
  condition text,
  intr smallint,
  type text not null check (char_length(type) <= 40),
  data jsonb,
  received_at timestamptz not null default now()
);
create unique index events_session_seq on public.events (session_id, seq);
create index events_type on public.events (type);

create table public.admin_emails (
  email text primary key
);

create table public.spotify_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  spotify_user_id text not null unique,
  display_name text,
  product text,
  refresh_token text not null,
  enabled boolean not null default true,
  lease_session uuid,
  lease_expires timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.sessions enable row level security;
alter table public.events enable row level security;
alter table public.admin_emails enable row level security;
alter table public.spotify_accounts enable row level security;

create policy "anon insert sessions" on public.sessions for insert to anon with check (true);
create policy "anon insert events" on public.events for insert to anon with check (true);
create policy "admin read sessions" on public.sessions for select to authenticated using (public.is_admin());
create policy "admin read events" on public.events for select to authenticated using (public.is_admin());
create policy "admin read accounts" on public.spotify_accounts for select to authenticated using (public.is_admin());
create policy "admin read admin list" on public.admin_emails for select to authenticated using (public.is_admin());

-- Defense in depth on top of RLS.
revoke all on public.sessions, public.events, public.admin_emails, public.spotify_accounts from anon, authenticated;
grant insert on public.sessions, public.events to anon;
grant usage on sequence public.events_id_seq to anon;
grant select on public.sessions, public.events, public.admin_emails to authenticated;
grant select (id, label, spotify_user_id, display_name, product, enabled, lease_session, lease_expires, created_at)
  on public.spotify_accounts to authenticated;   -- refresh_token deliberately excluded

-- Per-session overview for the admin page (RLS of the caller applies).
create view public.session_summary with (security_invoker = true) as
select
  s.session_id, s.pid, s.order_code, s.started_at, s.app_version, s.flags, s.device, s.spotify_label,
  coalesce(e.n_events, 0) as n_events,
  e.last_event_at,
  e.last_phase,
  coalesce(e.finished, false) as finished,
  coalesce(e.audio_errors, 0) as audio_errors,
  coalesce(e.email_timeouts, 0) as email_timeouts,
  coalesce(e.hidden_tabs, 0) as hidden_tabs,
  coalesce(e.upload_errors, 0) as upload_errors,
  coalesce(e.wrong_inputs, 0) as wrong_inputs,
  coalesce(e.interruptions, 0) as interruptions
from public.sessions s
left join lateral (
  select
    count(*) as n_events,
    max(received_at) as last_event_at,
    (array_agg(phase order by seq desc))[1] as last_phase,
    bool_or(type = 'session_end') as finished,
    count(*) filter (where type = 'audio_error') as audio_errors,
    count(*) filter (where type = 'interruption_timeout') as email_timeouts,
    count(*) filter (where type = 'visibility_change' and data ->> 'hidden' = 'true') as hidden_tabs,
    count(*) filter (where type = 'upload_error') as upload_errors,
    count(*) filter (where type = 'wrong_input') as wrong_inputs,
    count(*) filter (where type = 'reply_sent' and coalesce(data ->> 'practice', 'false') <> 'true') as interruptions
  from public.events ev where ev.session_id = s.session_id
) e on true;
grant select on public.session_summary to authenticated;

-- Atomic claim of a free Spotify account for a session (idempotent per session). Edge Functions only.
create or replace function public.claim_spotify_account(p_session uuid, p_seconds int default 120)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  select id into v from spotify_accounts where lease_session = p_session and enabled for update;
  if v is null then
    select id into v from spotify_accounts
      where enabled and (lease_session is null or lease_expires is null or lease_expires < now())
      order by lease_expires nulls first limit 1 for update skip locked;
  end if;
  if v is not null then
    update spotify_accounts set lease_session = p_session, lease_expires = now() + make_interval(secs => p_seconds) where id = v;
  end if;
  return v;
end $$;
revoke execute on function public.claim_spotify_account(uuid, int) from public, anon, authenticated;

create or replace function public.release_spotify_account(p_session uuid)
returns void language sql security definer set search_path = public as $$
  update spotify_accounts set lease_session = null, lease_expires = null where lease_session = p_session;
$$;
revoke execute on function public.release_spotify_account(uuid) from public, anon, authenticated;

insert into public.admin_emails (email) values ('anshbhagania4@gmail.com');
