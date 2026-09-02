-- =====================================================================
--  Site analytics
--
--  Run after schema.sql.
-- =====================================================================

create table if not exists public.analytics_events (
  id         bigserial primary key,
  -- 'page_view' | 'cta_click' | 'project_open' | 'social_click' |
  -- 'contact_submit' | 'filter_change' | 'outbound_click'
  type       text        not null,
  -- Route the event happened on.
  path       text        not null default '/',
  -- What was interacted with: a button name, a project slug, a network.
  label      text,
  -- Anonymous, per-tab, regenerated each session. Not a user identifier.
  session_id text,
  referrer   text,
  -- 'mobile' | 'tablet' | 'desktop'
  device     text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_type_idx    on public.analytics_events (type, created_at desc);

alter table public.analytics_events enable row level security;

/**
 * Visitors may record events and nothing else.
 *
 * There is deliberately no select policy for `anon`: without one, a visitor
 * can write an event but cannot read the table back, so nobody can enumerate
 * your traffic, referrers or sessions from the browser.
 */
drop policy if exists analytics_public_insert on public.analytics_events;
create policy analytics_public_insert on public.analytics_events
  for insert to anon, authenticated
  with check (true);

drop policy if exists analytics_admin_read on public.analytics_events;
create policy analytics_admin_read on public.analytics_events
  for select to authenticated
  using (public.is_admin());

drop policy if exists analytics_admin_write on public.analytics_events;
create policy analytics_admin_write on public.analytics_events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
--  Summary function
--
--  Aggregating in Postgres rather than shipping every row to the browser:
--  a busy month is tens of thousands of rows, and the dashboard only needs
--  the totals.
-- ---------------------------------------------------------------------

create or replace function public.analytics_summary(days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - make_interval(days => days);
  result jsonb;
begin
  -- Enforced here as well as by RLS: SECURITY DEFINER bypasses row-level
  -- security, so this function must check for itself.
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  select jsonb_build_object(
    'total_views', (
      select count(*) from analytics_events
      where type = 'page_view' and created_at >= since
    ),
    'unique_visitors', (
      select count(distinct session_id) from analytics_events
      where created_at >= since and session_id is not null
    ),
    'total_events', (
      select count(*) from analytics_events where created_at >= since
    ),
    'messages', (select count(*) from messages),
    'unread_messages', (select count(*) from messages where not read),

    'daily', (
      select coalesce(jsonb_agg(row order by row->>'day'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
          'views', count(*) filter (where type = 'page_view'),
          'visitors', count(distinct session_id)
        ) as row
        from analytics_events
        where created_at >= since
        group by date_trunc('day', created_at)
      ) d
    ),

    'by_type', (
      select coalesce(jsonb_object_agg(type, n), '{}'::jsonb)
      from (
        select type, count(*) as n from analytics_events
        where created_at >= since group by type
      ) t
    ),

    'top_pages', (
      select coalesce(jsonb_agg(row order by (row->>'n')::int desc), '[]'::jsonb)
      from (
        select jsonb_build_object('path', path, 'n', count(*)) as row
        from analytics_events
        where type = 'page_view' and created_at >= since
        group by path order by count(*) desc limit 10
      ) p
    ),

    'top_projects', (
      select coalesce(jsonb_agg(row order by (row->>'n')::int desc), '[]'::jsonb)
      from (
        select jsonb_build_object('label', label, 'n', count(*)) as row
        from analytics_events
        where type = 'project_open' and label is not null and created_at >= since
        group by label order by count(*) desc limit 10
      ) p
    ),

    'top_clicks', (
      select coalesce(jsonb_agg(row order by (row->>'n')::int desc), '[]'::jsonb)
      from (
        select jsonb_build_object('label', label, 'type', type, 'n', count(*)) as row
        from analytics_events
        where type in ('cta_click', 'social_click', 'outbound_click')
          and label is not null and created_at >= since
        group by label, type order by count(*) desc limit 12
      ) c
    ),

    'referrers', (
      select coalesce(jsonb_agg(row order by (row->>'n')::int desc), '[]'::jsonb)
      from (
        select jsonb_build_object('referrer', coalesce(nullif(referrer, ''), 'Direct'), 'n', count(*)) as row
        from analytics_events
        where type = 'page_view' and created_at >= since
        group by coalesce(nullif(referrer, ''), 'Direct')
        order by count(*) desc limit 8
      ) r
    ),

    'devices', (
      select coalesce(jsonb_object_agg(coalesce(device, 'unknown'), n), '{}'::jsonb)
      from (
        select device, count(distinct session_id) as n from analytics_events
        where created_at >= since group by device
      ) d
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.analytics_summary(integer) from public, anon;
grant execute on function public.analytics_summary(integer) to authenticated;
