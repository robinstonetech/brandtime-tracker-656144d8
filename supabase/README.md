# Supabase workspace

`supabase/migrations/` holds the timestamp-prefixed copies of the reviewed SQL
in `db/migrations/`. Apply them to **development first**, verify, then promote
the exact same files to production so the two schemas never drift.

Project refs:

| Environment | Ref |
| --- | --- |
| Development | `jwydonacprzffqasxhav` |
| Production  | `sezrcfpntuvpjdsnkedz` |

---

## Option A — Dashboard SQL editor (no local checkout)

### 1. Apply the schema

Open the **dev** project → SQL Editor → New query.

`supabase/apply_all_dev.sql` is every migration concatenated in order — paste
that one file and hit **Run**. If it's too large for a single paste, run the ten
files in `supabase/migrations/` individually, **in filename order**:

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

Order matters — enums and the security-definer role helpers are referenced by
later files.

### 2. Optional dev seed

Run `supabase/seed_dev.sql` last, **dev only**. It is deliberately not a
migration so it can never reach production.

Then sign up in the app and make yourself owner of the demo org:

```sql
insert into public.memberships (organization_id, user_id, role)
select o.id, '<your-auth-user-uuid>', 'owner'
from public.organizations o where o.slug = 'robinstone-demo';
```

### 3. Verify

Database → Tables should list: `organizations`, `organization_branding`,
`profiles`, `memberships`, `invitations`, `clients`, `projects`,
`project_branding`, `project_members`, `categories`, `timesheets`,
`time_entries`, `running_timers`.
Storage → Buckets should show `org-logos` and `avatars`.

### 4. Generate types

Dashboard → **Project Settings → API → Generating types**, or the API Docs page:

```text
https://supabase.com/dashboard/project/jwydonacprzffqasxhav/api?page=tables-intro
```

Copy the generated TypeScript into
`src/integrations/supabase/database.types.ts` (replacing the placeholder), or
paste it into chat and it'll be written in for you.

### 5. Promote to production

Only after dev is verified: repeat step 1 against `sezrcfpntuvpjdsnkedz`.
Never run `seed_dev.sql` there.

---

## Option B — Supabase CLI (needs a local checkout)

```bash
supabase login
supabase link --project-ref jwydonacprzffqasxhav   # asks for the DB password
supabase db push
supabase migration list                            # all files applied
supabase db execute --file supabase/seed_dev.sql   # dev only
supabase gen types typescript --project-id jwydonacprzffqasxhav \
  > src/integrations/supabase/database.types.ts
```

Promote with `supabase link --project-ref sezrcfpntuvpjdsnkedz && supabase db push`.

---

Migrations are forward-only. Fix mistakes with a new file; never edit one that
has already been applied. `apply_all_dev.sql` is a generated convenience copy —
regenerate it if the migration set changes, don't edit it by hand.
