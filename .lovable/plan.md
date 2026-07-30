## Goal

Apply `db/migrations/01…11` to the **development** project (`jwydonacprzffqasxhav`) from your own machine, then commit regenerated types back into this project.

## What you run locally (nothing here changes your repo)

### 1. Install / update the Supabase CLI
```bash
# macOS
brew install supabase/tap/supabase
# Windows (scoop)
scoop install supabase
# any OS, no install
npx supabase --version
```

### 2. Log in and link to the dev project
```bash
supabase login          # opens a browser, pastes back an access token
supabase link --project-ref jwydonacprzffqasxhav
```
It will ask for the dev project's **database password** (Supabase dashboard → Project Settings → Database → reset it if unknown).

### 3. Choose how to apply

**Option A — SQL editor (simplest, no local repo needed).**
Open the dev project's SQL editor and paste each file's contents in order `01 → 10`, running one at a time and checking for errors before the next. Skip `11_seed_dev.sql` unless you want demo data.

**Option B — CLI push (recommended, repeatable for prod later).**
Copy the files into a `supabase/migrations/` folder with timestamp-prefixed names so the CLI tracks them:
```text
supabase/migrations/
  20260730090001_extensions_and_enums.sql
  20260730090002_organizations.sql
  ... (same order as 01…10)
  20260730090011_seed_dev.sql   # dev only — leave out of the prod push
```
Then:
```bash
supabase db push
supabase migration list      # confirm every file shows applied
```

### 4. Finish the seed (only if you ran 11)
Sign up in the app first, then in the SQL editor grant yourself owner:
```sql
insert into public.memberships (organization_id, user_id, role)
select o.id, '<your-auth-user-uuid>', 'owner'
from public.organizations o where o.slug = 'robinstone-demo';
```

### 5. Regenerate types
```bash
supabase gen types typescript --project-id jwydonacprzffqasxhav \
  > src/integrations/supabase/database.types.ts
```
This overwrites the placeholder file. Two ways to get it into this project:
- push the file to the connected Git repo, or
- paste the generated file contents into chat / drop the file in, and I'll write it to `src/integrations/supabase/database.types.ts` for you.

### 6. Verify
- Admin → Environment page: badge reads **DEVELOPMENT**, health check green.
- `Database` type no longer has `Tables: Record<string, never>`.

## Notes

- Do **not** touch production (`sezrcfpntuvpjdsnkedz`) yet. When dev is verified, re-link to the prod ref and push the exact same files, minus `11_seed_dev.sql`.
- Migrations are forward-only; if something's wrong, add a new file rather than editing an applied one.
- If `01_extensions_and_enums.sql` errors on an extension, run it as the project owner in the SQL editor — hosted Supabase already has `pgcrypto`/`uuid-ossp` available under the `extensions` schema.

## Next step for me

Once you confirm the migrations are applied and hand over the generated types, I'll commit `database.types.ts` and move on to auth + the app shell (sign-up, sign-in, invitation acceptance, org-scoped layout).
