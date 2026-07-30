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
