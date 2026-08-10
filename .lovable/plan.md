# Projects contain Categories and Tasks — UI restructure

## Goal
Make the Projects page show the real hierarchy: each Project *contains* its
Categories and its Tasks. Replace the current four flat sibling tabs
(Projects / Clients / Categories / Tasks) with a single expandable Projects
list. Fold client management into the project surface (no standalone Clients tab).

Per your answers: **Expandable rows** layout, **Clients folded into Projects**.

## Current state (verified)
- `src/routes/_authenticated/projects.tsx` — one page, four sibling `<Tabs>`:
  - **Projects** tab (lines 219–312): flat table of all projects.
  - **Clients** tab (lines 314–390): flat table of clients w/ create/edit/activate.
  - **Categories** tab (lines 392–474): flat table of all categories w/ Project column + Edit/Deactivate/Delete.
  - **Tasks** tab (lines 476–583): flat table of all tasks w/ Project+Category columns + Edit/Mark-done/Delete.
- Data already supports hierarchy — no server/DB work needed:
  - `CategoryRow.projectId` (`projects.functions.ts:45`) filters categories per project.
  - `TaskRow.projectId` (`tasks-types.ts:9`) filters tasks per project; `getTasks` already returns all tasks.
  - `getProjectsPage` returns `projects`, `categories`, `clients`, `people`; `getTasks` returns `tasks`. Both already fetched by the page.
- Dialogs already exist and are reused: `ProjectDialog` (681), `ClientDialog` (865), `CategoryDialog` (940), `TaskDialog` (`src/components/tasks/TaskDialog.tsx`).

## Changes (frontend only — `src/routes/_authenticated/projects.tsx` + 2 dialogs)

### 1. Remove tabs; single expandable Projects list
- Delete the `<Tabs>`/`TabsList`/`TabsContent` wrapper.
- Keep a page header: title + two buttons (manager only): **New project** and **Manage clients** (see #4).
- Render one `<Table>` of projects (same columns as today: Project, Client, Status, Members, Actions).
- Add a leading **expand/collapse chevron** column. Track open rows in `useState<Set<string>>`.

### 2. Expanded row → nested Categories + Tasks
When a project row is expanded, render an indented panel (full-width `TableCell` spanning all columns, or a row beneath) with two sub-sections:

```
▼ Acme Portal                        [Edit] [Archive]
    Categories                        [+ New category]
      · Development   Billable   Active   [Edit][Deactivate][Delete]
      · Meetings      Non-bill   Active   [Edit][Deactivate][Delete]
    Tasks                             [+ New task]
      · Build API    Development  @jane  2h15m  Open   [Edit][Mark done][Delete]
      · Design mock  Meetings     —       0m      Open   [Edit][Mark done][Delete]
```

- **Categories sub-section**: filter `categories.filter(c => c.projectId === project.id)`. Reuse the exact row actions (Edit / Deactivate / Delete w/ AlertDialog) from the current Categories tab. "New category" opens `CategoryDialog` with `projectId` pre-set and locked.
- **Tasks sub-section**: filter `tasks.filter(t => t.projectId === project.id)`. Reuse the exact row actions (Edit / Mark done / Delete w/ AlertDialog) from the current Tasks tab. "New task" opens `TaskDialog` with `projectId` pre-set and locked; its Category picker already scopes to the project (`TaskDialog.tsx:69`).
- Empty-state hints per project ("No categories — add one", "No tasks — add one").
- Archived projects remain listed (muted) and still expandable.

### 3. Lock the project in Category & Task dialogs when opened from a row
- `CategoryDialog`: add optional `lockedProjectId?: string`. When provided, replace the Project `<Select>` with a read-only label of the project name (no picker). `projectId` state initializes to `lockedProjectId`.
- `TaskDialog` (`src/components/tasks/TaskDialog.tsx`): add optional `lockedProjectId?: string`. When provided, render the project read-only and skip clearing `categoryId` on a (now-impossible) project change. Keep the Category picker, already scoped to that project.
- Free-standing "New" still works, but in this design all category/task creation flows from a project row, so the lock is always set.

### 4. Fold Clients into the Projects surface (remove Clients tab)
Client attributes (name, contact email, active state) still need a management surface — without a tab, reach it two ways:
- **Project dialog → Client dropdown**: add a trailing **"+ New client…"** item that opens `ClientDialog` (new), then refreshes the dropdown on save.
- **"Manage clients" button** in the page header (manager only): opens a `Dialog` listing all clients with Edit + Activate/Deactivate (reusing existing `ClientDialog` + `setClientActive` mutation). This replaces the deleted Clients tab with a dialog, keeping create/edit/toggle reachable from the Projects page.
- `ClientDialog`: add an **"Active"** checkbox so activate/deactivate lives in the same place as create/edit (the current dialog only has name + email).

### 5. Keep what works
- `AlertDialog` confirmations for category and task delete — unchanged.
- All mutations (`archiveProject`, `saveCategory`, `setCategoryActive`, `deleteCategory`, `saveTask`, `setTaskStatus`, `deleteTask`, `saveClient`, `setClientActive`) — unchanged.
- `getProjectsPage` and `getTasks` — unchanged (already return the data we filter client-side).
- Dashboard "My tasks" card — unchanged (already nests project→category→task).

## Out of scope
- No database migrations, no server-function changes, no new queries.
- No changes to `EntryDialog`/`TimerBar` (project→category filtering already works there).
- Dashboard "My tasks" card untouched.

## Files touched
1. `src/routes/_authenticated/projects.tsx` — main restructure (tabs → expandable rows; remove Clients/Categories/Tasks tab bodies, fold into row panels; add Manage-clients dialog; pass locked project ids).
2. `src/components/tasks/TaskDialog.tsx` — add `lockedProjectId` prop (read-only project).
3. `src/lib/projects.functions.ts` — no logic change (the `CategoryDialog` lock is purely UI; project id still submitted).

## Risks / notes
- Archived projects stay in the same list today; if the list grows long we may want a collapsed "Archived" group later — not in this change.
- "Manage clients" as a dialog (not a tab) is the lightest way to keep client activate/deactivate without re-adding a tab. If you'd rather drop client activate/deactivate entirely, say so and I'll simplify to create/edit only.
