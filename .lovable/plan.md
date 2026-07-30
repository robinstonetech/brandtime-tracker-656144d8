## Goal

Today `clients → projects` already exists (`projects.client_id`), but categories are flat org-level records with no link to a project. This change gives each category an owning project (org-wide when none is set), shows each client's projects on the Clients tab, and filters the category picker by the selected project when logging time.

## 1. Database migration (for your review, applied by you)

New file `db/migrations/12_categories_project_link.sql`, also appended to `supabase/apply_all_dev.sql`:

- Add `project_id uuid references public.projects(id) on delete cascade` to `public.categories`.
- Replace the `unique (organization_id, name)` constraint with a pair that allows the same name under different projects:
  - unique index on `(organization_id, name)` where `project_id is null` (org-wide categories)
  - unique index on `(project_id, name)` where `project_id is not null`
- Add index `categories_project_idx on public.categories (project_id)`.
- A trigger/check keeping `categories.project_id` in the same organization as `categories.organization_id`.
- No grant changes needed (existing grants cover the table). RLS policies in `09_rls_work.sql` are org-scoped and continue to apply unchanged.

Existing categories keep `project_id = null` and stay available to every project, so nothing currently logged breaks.

## 2. Server functions

`src/lib/schemas.ts`
- `categorySchema` gains `projectId: uuid | null` (optional, defaults null).

`src/lib/projects.functions.ts`
- `getProjectsPage`: select `project_id` on categories; add `projectId` / `projectName` to `CategoryRow`; add a `projects: {id,name}[]` list per client (`ClientRow.projects`) built from the already-fetched projects instead of just `projectCount`.
- `saveCategory`: persist `project_id`, validating that the project belongs to the same organization.

`src/lib/time.functions.ts`
- `getPickers`: return `projectId` on each category option so the client can filter.
- Keep `getWeek` unchanged (entries still embed `categories(name)`).

## 3. UI

`src/routes/_authenticated/projects.tsx`
- Clients tab: replace the plain `Projects` count cell with the count plus the project names for that client (wrapped badges, "—" when none).
- Categories tab: new "Project" column showing the owning project or "All projects"; the category dialog gets a project select (`All projects` + org projects).

`src/components/time/EntryDialog.tsx` and `src/components/time/TimerBar.tsx`
- Filter the category options to those with `projectId === selectedProjectId` or `projectId === null`.
- When the project changes and the chosen category no longer applies, reset the category to none.

## 4. Verification

Typecheck, then load `/projects` in a browser to confirm the Clients tab lists projects and the category dialog saves a project link; check the entry dialog narrows categories per project.

Note: the migration must be run against your Supabase project (dev first) and the generated `database.types.ts` regenerated afterward — I'll update the local types file by hand in the same change so the code typechecks before you apply it.
