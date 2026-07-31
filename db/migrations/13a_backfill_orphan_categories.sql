-- 13a. Backfill: give every org-wide category a project before migration 13.
--
-- Each category with project_id is null is copied once per project in its
-- organization (skipping names that already exist on that project), then the
-- original org-wide row is deleted.
--
-- Inspect first:
--   select c.id, c.name, o.name as org
--   from public.categories c
--   join public.organizations o on o.id = c.organization_id
--   where c.project_id is null;

begin;

insert into public.categories (organization_id, name, color, is_billable, is_active, project_id)
select c.organization_id, c.name, c.color, c.is_billable, c.is_active, p.id
from public.categories c
join public.projects p
  on p.organization_id = c.organization_id
 and p.deleted_at is null
where c.project_id is null
  and not exists (
    select 1 from public.categories x
    where x.project_id = p.id and x.name = c.name
  );

-- Time entries pointing at an org-wide category are repointed to the copy that
-- belongs to the entry's project; entries without a project lose the category.
update public.time_entries e
set category_id = n.id
from public.categories c
join public.categories n
  on n.organization_id = c.organization_id and n.name = c.name
where e.category_id = c.id
  and c.project_id is null
  and n.project_id = e.project_id;

update public.time_entries e
set category_id = null
from public.categories c
where e.category_id = c.id
  and c.project_id is null;

delete from public.categories where project_id is null;

commit;
