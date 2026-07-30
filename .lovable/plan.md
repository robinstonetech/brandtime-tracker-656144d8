## Applying the schema through the Supabase SQL editor

No local checkout needed. You'll copy each SQL file from the Lovable Code Editor into the dashboard.

### Where the files are
In Lovable: Code Editor → `supabase/migrations/`. Ten files, already ordered:

```text
20260730090001_extensions_and_enums.sql
20260730090002_organizations.sql
20260730090003_profiles.sql
20260730090004_memberships_and_roles.sql
20260730090005_invitations.sql
20260730090006_projects_and_categories.sql
20260730090007_time_entries.sql
20260730090008_rls_core.sql
20260730090009_rls_work.sql
20260730090010_storage.sql
```

Plus `supabase/seed_dev.sql` (dev project only, run last).

### Steps
1. Open the **dev** project (`jwydonacprzffqasxhav`) → SQL Editor → New query.
2. Open file 1 in the Lovable Code Editor, select all, paste into the editor, Run.
3. Confirm "Success. No rows returned", then repeat for files 2 → 10 **in order**. Order matters: enums and helper functions are referenced by later files.
4. Run `supabase/seed_dev.sql` last, on the dev project only.
5. Spot-check: Database → Tables should list organizations, profiles, memberships, invitations, clients, projects, categories, timesheets, time_entries, running_timers; Storage should show `org-logos` and `avatars`.

If a statement fails partway, fix and re-run only that file — each file is written to be self-contained.

### Generating `database.types.ts` without the CLI
The dashboard can emit types directly: Project Settings → API → **Generating types** section, or hit the types endpoint. Easiest path:

1. Dashboard → API Docs (top-left icon) → **Tables and Views** → the introduction page has a TypeScript types block, or
2. Use the direct URL in a browser while logged in:
   `https://supabase.com/dashboard/project/jwydonacprzffqasxhav/api?page=tables-intro`

Copy the full generated `Database` type, paste it into chat, and I'll write it into `src/integrations/supabase/database.types.ts`, replacing the placeholder.

### After that
Once types land, next build step is auth + app shell:
- `/auth` public route (email + password sign-up/sign-in)
- `_authenticated/` gated layout with org-aware sidebar nav
- Org bootstrap flow for self-serve admins, invite-acceptance route for teammates
- Branding provider injecting org CSS variables

### Technical notes
- The production project (`sezrcfpntuvpjdsnkedz`) gets the same ten files later, without `seed_dev.sql`.
- `database.types.ts` is shared by both environments; the schemas must stay identical, so always apply dev first and promote the same files unchanged.
