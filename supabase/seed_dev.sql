-- 11. Development seed data (DEV PROJECT ONLY — do not run in production)
--
-- Creates a demo organization with branding, a client, two projects and
-- per-project categories. Memberships are intentionally NOT seeded: sign up in
-- the app, then run the final statement with your user id to become the owner.

do $$
declare
  org_id uuid;
  client_id uuid;
  proj record;
begin
  insert into public.organizations (name, slug, timezone)
  values ('Robinstone Demo', 'robinstone-demo', 'Europe/London')
  on conflict (slug) do update set name = excluded.name
  returning id into org_id;

  insert into public.organization_branding (organization_id, product_name, support_email)
  values (org_id, 'Robinstone Business Suite - Time', 'support@mytimesheets.app')
  on conflict (organization_id) do nothing;

  insert into public.clients (organization_id, name, contact_email)
  values (org_id, 'Acme Industries', 'ap@acme.example')
  on conflict (organization_id, name) do nothing
  returning id into client_id;

  if client_id is null then
    select id into client_id from public.clients
    where organization_id = org_id and name = 'Acme Industries';
  end if;

  insert into public.projects (organization_id, client_id, name, code, is_billable)
  values
    (org_id, client_id, 'Platform Migration', 'ACME-001', true),
    (org_id, null,      'Internal R&D',       'INT-001',  false)
  on conflict (organization_id, code) do nothing;

  -- Categories belong to exactly one project, so seed a set per demo project.
  for proj in
    select id from public.projects
    where organization_id = org_id and code in ('ACME-001', 'INT-001')
  loop
    insert into public.categories (organization_id, project_id, name, is_billable)
    values
      (org_id, proj.id, 'Development', true),
      (org_id, proj.id, 'Meetings',    true),
      (org_id, proj.id, 'Admin',       false),
      (org_id, proj.id, 'Leave',       false)
    on conflict (project_id, name) do nothing;
  end loop;
end $$;

-- After signing up in the app, run:
-- insert into public.memberships (organization_id, user_id, role)
-- select o.id, '<YOUR-AUTH-USER-ID>'::uuid, 'owner'
-- from public.organizations o where o.slug = 'robinstone-demo'
-- on conflict (organization_id, user_id) do update set role = 'owner';
