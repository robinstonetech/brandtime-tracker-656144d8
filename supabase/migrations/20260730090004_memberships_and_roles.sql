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
