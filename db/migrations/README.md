# SQL migrations (review copies)

These files target the **external** Supabase projects (development and
production). They are not applied automatically by Lovable.

## How to apply

1. Review each file in order (they are numbered and timestamped).
2. Copy them into your Supabase repo's `supabase/migrations/` folder, or paste
   them into the SQL editor in order.
3. Apply to **development** first:
   ```bash
   supabase link --project-ref jwydonacprzffqasxhav
   supabase db push
   ```
4. Regenerate types and commit:
   ```bash
   supabase gen types typescript --project-id jwydonacprzffqasxhav \
     > src/integrations/supabase/database.types.ts
   ```
5. When verified, repeat step 3 against production (`sezrcfpntuvpjdsnkedz`).

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
