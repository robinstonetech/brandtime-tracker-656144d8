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
