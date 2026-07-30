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
