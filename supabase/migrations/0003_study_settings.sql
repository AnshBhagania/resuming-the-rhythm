-- Admin-editable study settings (single row). Participants read them through get_study_settings(); only admins can change them.
-- (Applied to the project; kept here for reference.)
create table public.study_settings (
  id int primary key default 1 check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into public.study_settings (id, settings) values (1, jsonb_build_object('gaze', jsonb_build_object(
  'enabled', true, 'optional', true, 'gridCols', 3, 'gridRows', 3, 'clicksPerPoint', 5,
  'validationDwellMs', 2500, 'validationSettleMs', 1000, 'maxErrorPx', 250, 'maxAttempts', 3, 'sampleCapHz', 30)));
alter table public.study_settings enable row level security;
create policy "admin read settings" on public.study_settings for select to authenticated using (public.is_admin());
create policy "admin update settings" on public.study_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.study_settings from anon, authenticated;
grant select on public.study_settings to authenticated;
grant update (settings) on public.study_settings to authenticated;
create or replace function public.study_settings_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', 'unknown');
  return new;
end $$;
create trigger study_settings_touch before update on public.study_settings
  for each row execute function public.study_settings_touch();
create or replace function public.get_study_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('settings', settings, 'updated_at', updated_at) from public.study_settings where id = 1;
$$;
revoke execute on function public.get_study_settings() from public;
grant execute on function public.get_study_settings() to anon, authenticated;
