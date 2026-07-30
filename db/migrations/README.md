# SQL migrations (review copies)

These files target the **external** Supabase projects (development and
production). They are not applied automatically by Lovable.

CLI-ready, timestamp-prefixed copies of these same files live in
`supabase/migrations/` — push those. See `supabase/README.md` for the full
apply-and-regenerate-types walkthrough. Keep this folder as the reviewed
source of truth; if you edit a file here, copy it across before pushing.

Quick version:

```bash
supabase login
supabase link --project-ref jwydonacprzffqasxhav   # development
supabase db push
supabase gen types typescript --project-id jwydonacprzffqasxhav \
  > src/integrations/supabase/database.types.ts
```

Repeat the link + push against `sezrcfpntuvpjdsnkedz` once development is
verified. `11_seed_dev.sql` is dev-only and lives at `supabase/seed_dev.sql`
so it can never be pushed to production.


## Order

| File | Purpose |
| --- | --- |
| `01_extensions_and_enums.sql` | Extensions, enum types, shared trigger fn |
| `02_organizations.sql` | Organizations + branding |
| `03_profiles.sql` | User profiles mirroring `auth.users` |
| `04_memberships_and_roles.sql` | Memberships, `has_role`, `is_org_member` helpers |
| `05_invitations.sql` | Invitation records + acceptance RPC |
| `06_projects_and_categories.sql` | Clients, projects, project branding, categories |
| `07_time_entries.sql` | Timesheets, time entries, running timers |
| `08_rls_core.sql` | RLS for orgs, profiles, memberships, invitations |
| `09_rls_work.sql` | RLS for projects, categories, timesheets, entries |
| `10_storage.sql` | Storage buckets (logos, avatars) + policies |
| `11_seed_dev.sql` | Optional development seed data |
