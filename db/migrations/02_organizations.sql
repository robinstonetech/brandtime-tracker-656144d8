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
