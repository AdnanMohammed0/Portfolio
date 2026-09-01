-- =====================================================================
--  Integration settings — credentials edited from the dashboard
--
--  Run this after schema.sql.
-- =====================================================================

/**
 * Deliberately NOT stored in `site_content`.
 *
 * `site_content` carries a public read policy, because the public site has to
 * read the hero copy, the about text and so on. Anything placed there is
 * readable by any anonymous visitor through the REST API. A bot token in that
 * table would be world-readable.
 *
 * This table has no public policy at all: only rows an administrator requests
 * while signed in are returned, and only an administrator can write. The Edge
 * Function reads it with the service-role key, server-side.
 */
create table if not exists public.integration_settings (
  key        text primary key,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.integration_settings enable row level security;

-- No `anon` policy anywhere below. Visitors cannot read this table at all.

drop policy if exists integration_settings_admin_read on public.integration_settings;
create policy integration_settings_admin_read on public.integration_settings
  for select to authenticated
  using (public.is_admin());

drop policy if exists integration_settings_admin_write on public.integration_settings;
create policy integration_settings_admin_write on public.integration_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Starting row, so the dashboard has something to edit.
insert into public.integration_settings (key, value)
values (
  'telegram',
  jsonb_build_object(
    'enabled',   false,
    'bot_token', '',
    'chat_id',   ''
  )
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
--  Verify the table is not publicly readable
--
--  Run this from the SQL editor. It should return no rows for `anon`.
-- ---------------------------------------------------------------------

-- select polname, polroles::regrole[] from pg_policy
-- where polrelid = 'public.integration_settings'::regclass;
