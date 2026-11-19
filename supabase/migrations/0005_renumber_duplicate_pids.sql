-- Two participant ids were handed out twice on 2026-11-17 (P03) and 2026-11-19 (P14). Participant number N is tied to order ((N-1) mod 6)+1,
-- 18 participants in total (3 sets of the 6 orders), so each duplicate moves to the free slot of the same order:
--   P03 (O3): first run (07c8b0d4, 17 Nov 11:38) -> P09; second run (5b1a46e3, 12:57) keeps P03 (the number on its consent form)
--   P14 (O2): second run (8b7dc744, 19 Nov 17:45) -> P08; first run keeps P14
-- The old id stays in sessions.pid_original. To undo: update sessions set pid = pid_original ... and the same for events.pid.
-- Every update names the session id and the expected current pid, so running this twice changes nothing.
alter table public.sessions add column if not exists pid_original text;

update public.sessions set pid_original = pid, pid = 'P09' where session_id = '07c8b0d4-abeb-4eff-ac4e-22caffb12e2d' and pid = 'P03';
update public.events   set pid = 'P09' where session_id = '07c8b0d4-abeb-4eff-ac4e-22caffb12e2d' and pid = 'P03';

update public.sessions set pid_original = pid, pid = 'P08' where session_id = '8b7dc744-ec3c-4e7e-8806-c05ad03a62df' and pid = 'P14';
update public.events   set pid = 'P08' where session_id = '8b7dc744-ec3c-4e7e-8806-c05ad03a62df' and pid = 'P14';
