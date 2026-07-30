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
