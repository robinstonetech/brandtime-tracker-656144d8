# Project Tasks + Dashboard Task List

Add a task list to every project, assign team members to tasks, and let members start a timer directly from a task on the dashboard.

## What gets built

### Tasks
- Each project has its own task list.
- A task has: title, optional description, mandatory category (must belong to the same project), status (open / done), optional due date, and a list of assigned team members.
- No client on tasks — clients stay a project-level relationship.
- Managers, admins and owners create, edit, assign and delete tasks. Members can view tasks and start timers on them.

### Projects page
- Each project row/expander gains a "Tasks" section listing the project's tasks with title, category, assignees and status.
- Add / Edit task dialog: title, description, category (limited to that project's active categories, required), assignees (multi-select from the project's members, optional), due date, status.
- Row actions: Edit, Mark done / Reopen, Delete (with confirmation, same soft-red style as the category Delete button).

### Dashboard
- New "My tasks" section, listing open tasks grouped by project, then by category.
- Includes tasks assigned to the signed-in member, plus tasks with no assignees at all.
- Each task line starts with a Start button that starts the running timer for that task, prefilling project, category and description from the task. If a timer is already running, the button is disabled with a tooltip pointing at the timer bar.
- Empty state when there are no matching open tasks.

### Time tracking
- Time entries and running timers record which task they belong to, so hours roll up per task.
- Stopping a timer that was started from a task writes the task onto the resulting time entry.
- The projects task list shows total logged minutes per task.

## Technical details

**Migration `db/migrations/14_tasks.sql`** (for review, applied manually in the Supabase SQL editor as with previous migrations):
- `public.tasks`: id, organization_id, project_id (not null, cascade), category_id (not null, references categories, restrict), title, description, status enum-ish text check (`open` / `done`), due_on date, created_by, created_at, updated_at, deleted_at; `set_updated_at` trigger; indexes on (organization_id, project_id) and status.
- `public.task_assignees`: id, task_id (cascade), organization_id, user_id, unique (task_id, user_id), index on user_id.
- `alter table public.time_entries add column task_id uuid references public.tasks(id) on delete set null;` plus index.
- `alter table public.running_timers add column task_id uuid references public.tasks(id) on delete set null;`
- GRANTs: `select, insert, update, delete` to `authenticated`, `all` to `service_role` for both new tables.
- RLS mirroring `09_rls_work.sql`: members read via `is_org_member(organization_id)`; managers write via `has_min_role(organization_id, 'manager')`.
- A DB-level guard so a task's category belongs to the task's project (trigger or composite FK on `categories (id, project_id)`).

**Code changes**
- `src/integrations/supabase/database.types.ts` — hand-add `tasks`, `task_assignees`, and the new `task_id` columns/relationships (external Supabase project, types are maintained manually).
- `src/lib/schemas.ts` — `taskSchema` (organizationId, id?, projectId, categoryId required, title, description?, status, dueOn?, assigneeIds[]), `taskIdSchema`, and `taskId` added to `startTimerSchema` / `entrySchema` as optional uuid.
- `src/lib/tasks.functions.ts` (new) — `getProjectTasks`, `saveTask`, `setTaskStatus`, `deleteTask` (all manager+ for writes, `requireOrgRole` as elsewhere), and `getMyTasks` returning open tasks assigned to the caller or unassigned, grouped by project and category with logged-minute totals.
- `src/lib/time.functions.ts` — accept and persist `task_id` on `startTimer`, `stopTimer`, `createTimeEntry`, `updateTimeEntry`.
- `src/routes/_authenticated/projects.tsx` — tasks table per project plus the task dialog.
- `src/components/tasks/TaskDialog.tsx` (new) — task create/edit form.
- `src/routes/_authenticated/dashboard.tsx` — "My tasks" card with the grouped list and Start buttons, wired to the existing timer mutation used by `TimerBar`.

## Notes
- The migration must be run manually against the Supabase project before the UI works; the app will surface a clear error until then.
