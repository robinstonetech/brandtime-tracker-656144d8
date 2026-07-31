## State check

Migrations 13a and 13 are applied, and the app code already matches: `saveCategory` requires a project, `categorySchema.projectId` is a required uuid, the categories table/dialog on `/projects` show and require a project, and `EntryDialog` / `TimerBar` filter categories by the selected project. No functional work is outstanding.

Two leftovers still reflect the old "org-wide categories" model:

1. `src/integrations/supabase/database.types.ts` — `categories.project_id` is typed `string | null` (Row/Insert/Update), but the column is now `NOT NULL`. Cosmetic today, but it lets new code write a null project and only fail at runtime.
2. Seed SQL — `db/migrations/11_seed_dev.sql`, `supabase/seed_dev.sql`, and the categories block inside `supabase/apply_all_dev.sql` insert categories with no `project_id` and conflict on `(organization_id, name)`. Re-running any of them against a fresh dev database now fails on both the not-null column and the dropped unique constraint.

## Proposed changes

- Update `database.types.ts` so `categories.project_id` is `string` in Row and Insert and `string?` in Update.
- Rewrite the categories seed block (all three files, kept identical) to insert per project: look up each seeded project by code (`ACME-001`, `INT-001`) and give each its own Development / Meetings / Admin / Leave rows, with `on conflict (project_id, name) do nothing`.
- Append `13a_backfill_orphan_categories.sql` and `13_categories_require_project.sql` to `supabase/apply_all_dev.sql` so the bundled script matches the numbered migrations (13a is a no-op on a fresh database).

## Verification

Run a typecheck, then open `/projects` and the entry dialog to confirm the category flows still work against the migrated database.
