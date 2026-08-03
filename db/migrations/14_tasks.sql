-- 14. Project tasks, task assignees, and task links on time records

-- Composite unique key so a task can guarantee its category belongs to its project.
alter table public.categories
  drop constraint if exists categories_id_project_id_key;
alter table public.categories
  add constraint categories_id_project_id_key unique (id, project_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'done')),
  due_on date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Category must belong to the same project as the task.
  constraint tasks_category_in_project_fkey
    foreign key (category_id, project_id)
    references public.categories (id, project_id) on update cascade
);

create index if not exists tasks_org_project_idx on public.tasks (organization_id, project_id) where deleted_at is null;
create index if not exists tasks_status_idx on public.tasks (organization_id, status) where deleted_at is null;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create table if not exists public.task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, user_id)
);

create index if not exists task_assignees_user_idx on public.task_assignees (user_id);

alter table public.time_entries
  add column if not exists task_id uuid references public.tasks(id) on delete set null;
create index if not exists time_entries_task_idx on public.time_entries (task_id) where deleted_at is null;

alter table public.running_timers
  add column if not exists task_id uuid references public.tasks(id) on delete set null;

grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.task_assignees to authenticated;
grant all on public.tasks, public.task_assignees to service_role;

alter table public.tasks           enable row level security;
alter table public.task_assignees  enable row level security;

drop policy if exists "members read tasks" on public.tasks;
create policy "members read tasks" on public.tasks
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "managers write tasks" on public.tasks;
create policy "managers write tasks" on public.tasks
  for all to authenticated
  using (public.has_min_role(organization_id, 'manager'))
  with check (public.has_min_role(organization_id, 'manager'));

drop policy if exists "members read task assignees" on public.task_assignees;
create policy "members read task assignees" on public.task_assignees
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "managers write task assignees" on public.task_assignees;
create policy "managers write task assignees" on public.task_assignees
  for all to authenticated
  using (public.has_min_role(organization_id, 'manager'))
  with check (public.has_min_role(organization_id, 'manager'));
