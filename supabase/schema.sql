-- =====================================================================
--  Portfolio — schema, storage and row-level security
--  Run once in the Supabase SQL editor, then run seed.sql.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
--  Tables
-- ---------------------------------------------------------------------

-- Who may edit the portfolio. Membership of this table IS the authorisation:
-- every write policy below checks it, so no client-side flag can grant access.
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  title             text        not null default 'Untitled project',
  slug              text        not null unique,
  short_description text        not null default '',
  full_description  text        not null default '',
  cover_image       text,
  cover_alt         text        not null default '',
  video_url         text,
  technologies      text[]      not null default '{}',
  category          text        not null default '',
  year              text        not null default '',
  project_url       text,
  github_url        text,
  featured          boolean     not null default false,
  published         boolean     not null default false,
  sort_order        integer     not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists projects_published_idx on public.projects (published, sort_order);
create index if not exists projects_slug_idx      on public.projects (slug);

create table if not exists public.project_images (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid    not null references public.projects (id) on delete cascade,
  url        text    not null,
  alt        text    not null default '',
  sort_order integer not null default 0
);

create index if not exists project_images_project_idx
  on public.project_images (project_id, sort_order);

create table if not exists public.skills (
  id         uuid primary key default gen_random_uuid(),
  name       text    not null,
  category   text    not null default 'Core',
  sort_order integer not null default 0
);

create table if not exists public.experience (
  id           uuid primary key default gen_random_uuid(),
  date_range   text    not null default '',
  position     text    not null default '',
  organization text    not null default '',
  description  text    not null default '',
  sort_order   integer not null default 0
);

-- Hero / About / Contact / Settings, one JSON document per section.
create table if not exists public.site_content (
  key        text primary key,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.media (
  id         uuid primary key default gen_random_uuid(),
  url        text        not null,
  path       text        not null,
  name       text        not null,
  type       text        not null default 'image' check (type in ('image', 'video')),
  size       bigint      not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null,
  message    text        not null,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  Helpers
-- ---------------------------------------------------------------------

-- SECURITY DEFINER so policies can read admin_users without recursing
-- through that table's own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
--  Row-level security
--
--  Public reads: published projects and the content that renders the site.
--  All writes: administrators only, enforced by the database.
-- ---------------------------------------------------------------------

alter table public.admin_users    enable row level security;
alter table public.projects       enable row level security;
alter table public.project_images enable row level security;
alter table public.skills         enable row level security;
alter table public.experience     enable row level security;
alter table public.site_content   enable row level security;
alter table public.media          enable row level security;
alter table public.messages       enable row level security;

-- admin_users ---------------------------------------------------------
drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read on public.admin_users
  for select to authenticated
  using (user_id = auth.uid());

-- projects ------------------------------------------------------------
drop policy if exists projects_public_read on public.projects;
create policy projects_public_read on public.projects
  for select to anon, authenticated
  using (published or public.is_admin());

drop policy if exists projects_admin_write on public.projects;
create policy projects_admin_write on public.projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- project_images ------------------------------------------------------
drop policy if exists project_images_public_read on public.project_images;
create policy project_images_public_read on public.project_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.published or public.is_admin())
    )
  );

drop policy if exists project_images_admin_write on public.project_images;
create policy project_images_admin_write on public.project_images
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- skills / experience / site_content / media --------------------------
drop policy if exists skills_public_read on public.skills;
create policy skills_public_read on public.skills
  for select to anon, authenticated using (true);

drop policy if exists skills_admin_write on public.skills;
create policy skills_admin_write on public.skills
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists experience_public_read on public.experience;
create policy experience_public_read on public.experience
  for select to anon, authenticated using (true);

drop policy if exists experience_admin_write on public.experience;
create policy experience_admin_write on public.experience
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists site_content_public_read on public.site_content;
create policy site_content_public_read on public.site_content
  for select to anon, authenticated using (true);

drop policy if exists site_content_admin_write on public.site_content;
create policy site_content_admin_write on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists media_public_read on public.media;
create policy media_public_read on public.media
  for select to anon, authenticated using (true);

drop policy if exists media_admin_write on public.media;
create policy media_admin_write on public.media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- messages ------------------------------------------------------------
-- Anyone may send one; only administrators may read or delete them.
drop policy if exists messages_public_insert on public.messages;
create policy messages_public_insert on public.messages
  for insert to anon, authenticated with check (true);

drop policy if exists messages_admin_read on public.messages;
create policy messages_admin_read on public.messages
  for select to authenticated using (public.is_admin());

drop policy if exists messages_admin_write on public.messages;
create policy messages_admin_write on public.messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
--  Storage
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists media_bucket_public_read on storage.objects;
create policy media_bucket_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists media_bucket_admin_write on storage.objects;
create policy media_bucket_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
