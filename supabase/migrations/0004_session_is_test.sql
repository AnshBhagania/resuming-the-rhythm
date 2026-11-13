-- Every session that exists when this migration runs is a test session (pilot runs by the team). Sessions created afterwards default to
-- is_test = false and are the ones to analyse. Clients cannot set the column: ingest_session does not write it.
alter table public.sessions add column if not exists is_test boolean not null default false;
update public.sessions set is_test = true where started_at <= now();

create or replace view public.session_summary with (security_invoker = true) as
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
  coalesce(e.interruptions, 0) as interruptions,
  s.is_test
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
