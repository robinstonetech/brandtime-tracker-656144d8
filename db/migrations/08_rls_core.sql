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
