# Supabase CLI workspace

`supabase/migrations/` holds the CLI-ready, timestamp-prefixed copies of the
reviewed SQL in `db/migrations/`. Push these; don't hand-run SQL in the
dashboard, so dev and prod stay identical.

Project refs:

| Environment | Ref |
| --- | --- |
| Development | `jwydonacprzffqasxhav` |
| Production  | `sezrcfpntuvpjdsnkedz` |

## 1. Install the CLI

```bash
brew install supabase/tap/supabase   # macOS
scoop install supabase               # Windows
npx supabase --version               # no install
```

## 2. Link to development

```bash
supabase login
supabase link --project-ref jwydonacprzffqasxhav
```

You'll be asked for the project's **database password**
(Dashboard → Project Settings → Database → reset it if unknown).

## 3. Apply the migrations

```bash
supabase db push
supabase migration list      # every file should show as applied
```

## 4. Optional dev seed

`seed_dev.sql` is deliberately **not** a migration so it can never reach
production. Run it only against dev:

```bash
supabase db execute --file supabase/seed_dev.sql
```

Then sign up in the app and make yourself owner of the demo org:

```sql
insert into public.memberships (organization_id, user_id, role)
select o.id, '<your-auth-user-uuid>', 'owner'
from public.organizations o where o.slug = 'robinstone-demo';
```

## 5. Regenerate types

```bash
supabase gen types typescript --project-id jwydonacprzffqasxhav \
  > src/integrations/supabase/database.types.ts
```

Commit the result (it replaces the placeholder). If you can't commit directly,
paste the file contents into chat and I'll write it in.

## 6. Promote to production

Only after dev is verified:

```bash
supabase link --project-ref sezrcfpntuvpjdsnkedz
supabase db push
```

`seed_dev.sql` is never run in production. Migrations are forward-only — fix
mistakes with a new file, never by editing an applied one.
