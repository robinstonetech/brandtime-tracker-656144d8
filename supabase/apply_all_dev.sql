-- ============================================================
-- 20260730090001_extensions_and_enums.sql
-- ============================================================
-- 01. Extensions, enum types, shared helpers
-- Robinstone Business Suite - Time

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$ begin
  create type public.app_role as enum ('owner', 'admin', 'manager', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.timesheet_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum ('active', 'on_hold', 'archived');
exception when duplicate_object then null; end $$;

-- Shared updated_at trigger function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 20260730090002_organizations.sql
-- ============================================================
-- 02. Organizations and organization branding

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  -- Default working week / rounding preferences.
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  timezone text not null default 'UTC',
  default_daily_minutes integer not null default 480 check (default_daily_minutes > 0),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists organizations_active_idx on public.organizations (is_active) where deleted_at is null;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- One branding row per organization.
create table if not exists public.organization_branding (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  logo_url text,
  logo_dark_url text,
  favicon_url text,
  -- HSL triples stored as "H S% L%" so they can be injected straight into CSS vars.
  primary_color text not null default '222 47% 24%',
  accent_color text not null default '199 89% 48%',
  background_color text not null default '0 0% 100%',
  foreground_color text not null default '222 47% 11%',
  font_family text,
  product_name text not null default 'Robinstone Business Suite - Time',
  support_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organization_branding_set_updated_at
  before update on public.organization_branding
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
grant select, insert, update, delete on public.organization_branding to authenticated;
grant all on public.organization_branding to service_role;

-- ============================================================
-- 20260730090003_profiles.sql
-- ============================================================
-- 03. Profiles (mirror of auth.users for app-visible identity)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null,
  full_name text,
  avatar_url text,
  job_title text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- ============================================================
-- 20260730090004_memberships_and_roles.sql
-- ============================================================
-- 04. Memberships and role helper functions
-- Roles live in their own table (never on profiles) to prevent privilege escalation.

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'member',
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists memberships_user_idx on public.memberships (user_id) where is_active;
create index if not exists memberships_org_idx on public.memberships (organization_id) where is_active;

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Security-definer helpers. These bypass RLS so policies can reference them
-- without recursing into the memberships table.
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(_org_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = _org_id
      and m.user_id = _user_id
      and m.is_active
  );
$$;

create or replace function public.has_role(_org_id uuid, _role public.app_role, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = _org_id
      and m.user_id = _user_id
      and m.role = _role
      and m.is_active
  );
$$;

-- owner > admin > manager > member
create or replace function public.has_min_role(_org_id uuid, _role public.app_role, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = _org_id
      and m.user_id = _user_id
      and m.is_active
      and array_position(array['member','manager','admin','owner']::public.app_role[], m.role)
          >= array_position(array['member','manager','admin','owner']::public.app_role[], _role)
  );
$$;

grant select, insert, update, delete on public.memberships to authenticated;
grant all on public.memberships to service_role;
grant execute on function public.is_org_member(uuid, uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role, uuid) to authenticated;
grant execute on function public.has_min_role(uuid, public.app_role, uuid) to authenticated;

-- ============================================================
-- 20260730090005_invitations.sql
-- ============================================================
-- 05. Invitations (hybrid onboarding: self-serve owners, invited teammates)

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email citext not null,
  role public.app_role not null default 'member',
  status public.invitation_status not null default 'pending',
  -- SHA-256 of the token that is emailed; the raw token is never stored.
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists invitations_pending_unique
  on public.invitations (organization_id, email)
  where status = 'pending';

create index if not exists invitations_email_idx on public.invitations (email);

create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function public.set_updated_at();

-- Accept an invitation for the calling user. Runs as definer so the invitee
-- (not yet a member) can create their own membership row exactly once.
create or replace function public.accept_invitation(_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations;
  uid uuid := auth.uid();
  uemail citext;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select email into uemail from public.profiles where id = uid;

  select * into inv
  from public.invitations
  where token_hash = _token_hash
  for update;

  if inv.id is null then
    raise exception 'Invitation not found';
  end if;
  if inv.status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;
  if inv.expires_at < now() then
    update public.invitations set status = 'expired' where id = inv.id;
    raise exception 'Invitation has expired';
  end if;
  if lower(inv.email) <> lower(uemail) then
    raise exception 'Invitation was issued to a different email address';
  end if;

  insert into public.memberships (organization_id, user_id, role, invited_by)
  values (inv.organization_id, uid, inv.role, inv.invited_by)
  on conflict (organization_id, user_id)
  do update set is_active = true, role = excluded.role;

  update public.invitations
     set status = 'accepted', accepted_at = now(), accepted_by = uid
   where id = inv.id;

  return inv.organization_id;
end;
$$;

grant select, insert, update, delete on public.invitations to authenticated;
grant all on public.invitations to service_role;
grant execute on function public.accept_invitation(text) to authenticated;

-- ============================================================
-- 20260730090006_projects_and_categories.sql
-- ============================================================
-- 06. Clients, projects, project branding, categories

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_email citext,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, name)
);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  code text,
  description text,
  status public.project_status not null default 'active',
  is_billable boolean not null default true,
  default_hourly_rate numeric(12,2),
  budget_minutes integer check (budget_minutes is null or budget_minutes > 0),
  starts_on date,
  ends_on date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, code)
);

create index if not exists projects_org_idx on public.projects (organization_id) where deleted_at is null;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Optional per-project branding overrides layered on top of org branding.
create table if not exists public.project_branding (
  project_id uuid primary key references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  logo_url text,
  primary_color text,
  accent_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger project_branding_set_updated_at
  before update on public.project_branding
  for each row execute function public.set_updated_at();

-- Who may log time to which project.
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hourly_rate numeric(12,2),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_members_user_idx on public.project_members (user_id);

-- Work categories / activity types.
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text,
  is_billable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_branding to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.clients, public.projects, public.project_branding,
             public.project_members, public.categories to service_role;

-- ============================================================
-- 20260730090007_time_entries.sql
-- ============================================================
-- 07. Timesheets, time entries, running timers

create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- First day of the timesheet period (org week_starts_on aligned).
  period_start date not null,
  period_end date not null,
  status public.timesheet_status not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  total_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, period_start)
);

create index if not exists timesheets_org_status_idx on public.timesheets (organization_id, status);

create trigger timesheets_set_updated_at
  before update on public.timesheets
  for each row execute function public.set_updated_at();

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  timesheet_id uuid references public.timesheets(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  entry_date date not null,
  -- Duration is the source of truth; start/end are optional metadata.
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  started_at timestamptz,
  ended_at timestamptz,
  description text,
  is_billable boolean not null default true,
  hourly_rate numeric(12,2),
  source text not null default 'manual' check (source in ('manual', 'timer', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists time_entries_user_date_idx on public.time_entries (user_id, entry_date) where deleted_at is null;
create index if not exists time_entries_org_date_idx on public.time_entries (organization_id, entry_date) where deleted_at is null;
create index if not exists time_entries_project_idx on public.time_entries (project_id) where deleted_at is null;

create trigger time_entries_set_updated_at
  before update on public.time_entries
  for each row execute function public.set_updated_at();

-- Keep the parent timesheet total in sync.
create or replace function public.sync_timesheet_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ts uuid := coalesce(new.timesheet_id, old.timesheet_id);
begin
  if ts is not null then
    update public.timesheets t
       set total_minutes = coalesce((
             select sum(e.duration_minutes) from public.time_entries e
             where e.timesheet_id = ts and e.deleted_at is null
           ), 0)
     where t.id = ts;
  end if;
  return null;
end;
$$;

drop trigger if exists time_entries_sync_total on public.time_entries;
create trigger time_entries_sync_total
  after insert or update or delete on public.time_entries
  for each row execute function public.sync_timesheet_total();

-- Exactly one running timer per user (enforced by the primary key).
create table if not exists public.running_timers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger running_timers_set_updated_at
  before update on public.running_timers
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.timesheets to authenticated;
grant select, insert, update, delete on public.time_entries to authenticated;
grant select, insert, update, delete on public.running_timers to authenticated;
grant all on public.timesheets, public.time_entries, public.running_timers to service_role;

-- ============================================================
-- 20260730090008_rls_core.sql
-- ============================================================
-- 08. RLS: organizations, branding, profiles, memberships, invitations

alter table public.organizations         enable row level security;
alter table public.organization_branding enable row level security;
alter table public.profiles              enable row level security;
alter table public.memberships           enable row level security;
alter table public.invitations           enable row level security;

-- --------------------------- organizations --------------------------------
drop policy if exists "members read own orgs" on public.organizations;
create policy "members read own orgs" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

-- Self-serve signup: any authenticated user may create an org they own.
drop policy if exists "authenticated create org" on public.organizations;
create policy "authenticated create org" on public.organizations
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "admins update org" on public.organizations;
create policy "admins update org" on public.organizations
  for update to authenticated
  using (public.has_min_role(id, 'admin'))
  with check (public.has_min_role(id, 'admin'));

drop policy if exists "owners delete org" on public.organizations;
create policy "owners delete org" on public.organizations
  for delete to authenticated
  using (public.has_role(id, 'owner'));

-- ------------------------ organization_branding ---------------------------
drop policy if exists "members read branding" on public.organization_branding;
create policy "members read branding" on public.organization_branding
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "admins write branding" on public.organization_branding;
create policy "admins write branding" on public.organization_branding
  for all to authenticated
  using (public.has_min_role(organization_id, 'admin'))
  with check (public.has_min_role(organization_id, 'admin'));

-- ------------------------------ profiles ----------------------------------
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Members can see the profiles of people in their organizations.
drop policy if exists "read co-member profiles" on public.profiles;
create policy "read co-member profiles" on public.profiles
  for select to authenticated
  using (exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid() and mine.is_active
      and theirs.user_id = public.profiles.id and theirs.is_active
  ));

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------- memberships ---------------------------------
drop policy if exists "read memberships in my orgs" on public.memberships;
create policy "read memberships in my orgs" on public.memberships
  for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));

-- Founding membership: the org creator inserts their own owner row.
drop policy if exists "bootstrap or admin add member" on public.memberships;
create policy "bootstrap or admin add member" on public.memberships
  for insert to authenticated
  with check (
    public.has_min_role(organization_id, 'admin')
    or (
      user_id = auth.uid()
      and role = 'owner'
      and exists (
        select 1 from public.organizations o
        where o.id = organization_id and o.created_by = auth.uid()
      )
      and not exists (
        select 1 from public.memberships m where m.organization_id = organization_id
      )
    )
  );

drop policy if exists "admins update memberships" on public.memberships;
create policy "admins update memberships" on public.memberships
  for update to authenticated
  using (public.has_min_role(organization_id, 'admin'))
  with check (public.has_min_role(organization_id, 'admin'));

drop policy if exists "admins remove memberships" on public.memberships;
create policy "admins remove memberships" on public.memberships
  for delete to authenticated
  using (public.has_min_role(organization_id, 'admin'));

-- ---------------------------- invitations ---------------------------------
-- Invitees look their invitation up by token hash through a server function
-- using the service role; browsers only ever see their own org's invitations.
drop policy if exists "admins read invitations" on public.invitations;
create policy "admins read invitations" on public.invitations
  for select to authenticated
  using (public.has_min_role(organization_id, 'admin'));

drop policy if exists "admins create invitations" on public.invitations;
create policy "admins create invitations" on public.invitations
  for insert to authenticated
  with check (public.has_min_role(organization_id, 'admin') and invited_by = auth.uid());

drop policy if exists "admins update invitations" on public.invitations;
create policy "admins update invitations" on public.invitations
  for update to authenticated
  using (public.has_min_role(organization_id, 'admin'))
  with check (public.has_min_role(organization_id, 'admin'));

-- ============================================================
-- 20260730090009_rls_work.sql
-- ============================================================
-- 09. RLS: clients, projects, project members/branding, categories,
--     timesheets, time entries, running timers

alter table public.clients          enable row level security;
alter table public.projects         enable row level security;
alter table public.project_branding enable row level security;
alter table public.project_members  enable row level security;
alter table public.categories       enable row level security;
alter table public.timesheets       enable row level security;
alter table public.time_entries     enable row level security;
alter table public.running_timers   enable row level security;

-- ------------------------------ clients -----------------------------------
drop policy if exists "members read clients" on public.clients;
create policy "members read clients" on public.clients
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "managers write clients" on public.clients;
create policy "managers write clients" on public.clients
  for all to authenticated
  using (public.has_min_role(organization_id, 'manager'))
  with check (public.has_min_role(organization_id, 'manager'));

-- ------------------------------ projects ----------------------------------
drop policy if exists "members read projects" on public.projects;
create policy "members read projects" on public.projects
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "managers write projects" on public.projects;
create policy "managers write projects" on public.projects
  for all to authenticated
  using (public.has_min_role(organization_id, 'manager'))
  with check (public.has_min_role(organization_id, 'manager'));

-- -------------------------- project branding -------------------------------
drop policy if exists "members read project branding" on public.project_branding;
create policy "members read project branding" on public.project_branding
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "managers write project branding" on public.project_branding;
create policy "managers write project branding" on public.project_branding
  for all to authenticated
  using (public.has_min_role(organization_id, 'manager'))
  with check (public.has_min_role(organization_id, 'manager'));

-- --------------------------- project members -------------------------------
drop policy if exists "members read project members" on public.project_members;
create policy "members read project members" on public.project_members
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "managers write project members" on public.project_members;
create policy "managers write project members" on public.project_members
  for all to authenticated
  using (public.has_min_role(organization_id, 'manager'))
  with check (public.has_min_role(organization_id, 'manager'));

-- ----------------------------- categories ----------------------------------
drop policy if exists "members read categories" on public.categories;
create policy "members read categories" on public.categories
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "managers write categories" on public.categories;
create policy "managers write categories" on public.categories
  for all to authenticated
  using (public.has_min_role(organization_id, 'manager'))
  with check (public.has_min_role(organization_id, 'manager'));

-- ----------------------------- timesheets -----------------------------------
drop policy if exists "read own or managed timesheets" on public.timesheets;
create policy "read own or managed timesheets" on public.timesheets
  for select to authenticated
  using (user_id = auth.uid() or public.has_min_role(organization_id, 'manager'));

drop policy if exists "create own timesheet" on public.timesheets;
create policy "create own timesheet" on public.timesheets
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

-- Owner may edit only while draft/rejected; managers may review any.
drop policy if exists "update own draft timesheet" on public.timesheets;
create policy "update own draft timesheet" on public.timesheets
  for update to authenticated
  using (user_id = auth.uid() and status in ('draft', 'rejected'))
  with check (user_id = auth.uid());

drop policy if exists "managers review timesheets" on public.timesheets;
create policy "managers review timesheets" on public.timesheets
  for update to authenticated
  using (public.has_min_role(organization_id, 'manager'))
  with check (public.has_min_role(organization_id, 'manager'));

-- ---------------------------- time entries ----------------------------------
drop policy if exists "read own or managed entries" on public.time_entries;
create policy "read own or managed entries" on public.time_entries
  for select to authenticated
  using (user_id = auth.uid() or public.has_min_role(organization_id, 'manager'));

drop policy if exists "create own entries" on public.time_entries;
create policy "create own entries" on public.time_entries
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

drop policy if exists "update own unlocked entries" on public.time_entries;
create policy "update own unlocked entries" on public.time_entries
  for update to authenticated
  using (
    user_id = auth.uid()
    and (
      timesheet_id is null
      or exists (
        select 1 from public.timesheets t
        where t.id = time_entries.timesheet_id and t.status in ('draft', 'rejected')
      )
    )
  )
  with check (user_id = auth.uid());

drop policy if exists "managers update entries" on public.time_entries;
create policy "managers update entries" on public.time_entries
  for update to authenticated
  using (public.has_min_role(organization_id, 'manager'))
  with check (public.has_min_role(organization_id, 'manager'));

drop policy if exists "delete own unlocked entries" on public.time_entries;
create policy "delete own unlocked entries" on public.time_entries
  for delete to authenticated
  using (
    user_id = auth.uid()
    and (
      timesheet_id is null
      or exists (
        select 1 from public.timesheets t
        where t.id = time_entries.timesheet_id and t.status in ('draft', 'rejected')
      )
    )
  );

-- ---------------------------- running timers --------------------------------
drop policy if exists "own running timer" on public.running_timers;
create policy "own running timer" on public.running_timers
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

-- ============================================================
-- 20260730090010_storage.sql
-- ============================================================
-- 10. Storage buckets and policies
-- org-logos : public read (branding is shown on login/invite pages)
-- avatars   : public read, owner write

insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Object paths are "<organization_id>/<filename>" for org-logos
-- and "<user_id>/<filename>" for avatars.

drop policy if exists "public read org logos" on storage.objects;
create policy "public read org logos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'org-logos');

drop policy if exists "admins manage org logos" on storage.objects;
create policy "admins manage org logos" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'org-logos'
    and public.has_min_role(((storage.foldername(name))[1])::uuid, 'admin')
  )
  with check (
    bucket_id = 'org-logos'
    and public.has_min_role(((storage.foldername(name))[1])::uuid, 'admin')
  );

drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "users manage own avatar" on storage.objects;
create policy "users manage own avatar" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ==== 12_categories_project_link.sql ====
-- 12. Link categories to an owning project (null = available to all projects)

alter table public.categories
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

-- The old constraint forced unique names per org; names may now repeat per project.
alter table public.categories
  drop constraint if exists categories_organization_id_name_key;

create unique index if not exists categories_org_name_global_idx
  on public.categories (organization_id, name)
  where project_id is null;

create unique index if not exists categories_project_name_idx
  on public.categories (project_id, name)
  where project_id is not null;

create index if not exists categories_project_idx on public.categories (project_id);

-- Keep the category's project inside the same organization.
create or replace function public.categories_check_project_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.project_id is not null then
    if not exists (
      select 1 from public.projects p
      where p.id = new.project_id
        and p.organization_id = new.organization_id
    ) then
      raise exception 'Category project must belong to the same organization';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_check_project_org on public.categories;
create trigger categories_check_project_org
  before insert or update on public.categories
  for each row execute function public.categories_check_project_org();
-- 13. Categories belong to exactly one project (no org-wide categories)

-- Any leftover org-wide categories must be attached to a project first.
-- This assigns them to nothing and instead fails loudly so no data is guessed at.
do $$
declare
  orphan_count integer;
begin
  select count(*) into orphan_count from public.categories where project_id is null;
  if orphan_count > 0 then
    raise exception 'Assign a project to % category row(s) with project_id is null before running this migration', orphan_count;
  end if;
end;
$$;

alter table public.categories
  alter column project_id set not null;

-- The partial "org-wide" unique index is no longer meaningful.
drop index if exists public.categories_org_name_global_idx;

-- Names are unique within a project.
drop index if exists public.categories_project_name_idx;
create unique index if not exists categories_project_name_idx
  on public.categories (project_id, name);
