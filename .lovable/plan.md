## Foundation — External Supabase Integration

The full architecture, schema, RLS strategy, and assumptions were already presented in `.lovable/plan.md`. This plan adds only what changes because you're using your **externally managed Supabase dev project** (no Lovable Cloud) and updates the delivery flow so migrations are reviewed before execution.

Refer back to `.lovable/plan.md` for the unchanged sections (architecture, schema, RLS, navigation, folder structure, assumptions #1–#12). Deltas below.

---

### 1. Backend connection

- No Lovable Cloud project will be provisioned.
- I will connect to your dev Supabase project using secrets you paste into the secure form:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (browser)
  - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server)
- Hand-written Supabase integration files (since the Lovable Cloud generator is not running):
  - `src/integrations/supabase/client.ts` — browser client (publishable key, persisted session)
  - `src/integrations/supabase/client.server.ts` — service-role admin client, server-only, loaded inside handlers
  - `src/integrations/supabase/auth-middleware.ts` — `requireSupabaseAuth` middleware for `createServerFn`
  - `src/integrations/supabase/auth-attacher.ts` — `functionMiddleware` that attaches the bearer to server-fn calls
  - `src/integrations/supabase/types.ts` — placeholder committed by me; **you** regenerate with `supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts` after each migration lands and paste/commit it. I'll pull from it via `Database` generics.

### 2. Migration workflow (review-before-execute)

- All schema SQL is written to `supabase/migrations/<timestamp>_<name>.sql` in the repo.
- I never execute migrations against your project. For each phase I will:
  1. Write the migration file(s).
  2. Post the SQL inline in chat for review.
  3. Wait for your "apply" confirmation, then continue building app code that depends on it.
- You run them via `supabase db push` (or the SQL editor) against your dev project, then regenerate types.
- Migration numbering follows §9 of `.lovable/plan.md` (`0001_extensions_and_enums.sql` → `0013_seed_lookup_data.sql`), each as a timestamped file so Supabase CLI orders them correctly.
- Storage buckets: created via SQL in `0012_storage_buckets_and_policies.sql` using `storage.create_bucket` / inserts into `storage.buckets`, plus `storage.objects` policies — no reliance on the Lovable storage tool.

### 3. Auth changes vs. `.lovable/plan.md`

- Auth providers, onboarding, invite flow, roles, and gating all unchanged.
- `_authenticated/route.tsx` gate: I will hand-author it (no integration manager present) using the same `ssr: false` + `supabase.auth.getUser()` pattern documented in the TanStack Supabase guide.
- `src/start.ts` gets `attachSupabaseAuth` appended to `functionMiddleware` so protected server fns receive the bearer.

### 4. Delivery phases (revised order)

```text
Phase 0  Secrets intake + Supabase client/middleware/auth-attacher files + placeholder types.ts
Phase 1  Migrations 0001–0013 written to supabase/migrations/, posted for review, applied by you, then types regenerated
Phase 2  Auth + onboarding + invites + Mailtrap email helper (Mailtrap secrets requested when we reach this phase)
Phase 3  Branding engine + ThemeProvider + org branding UI
Phase 4  Projects, categories, member assignment
Phase 5  Time entries + weekly timesheet grid + running timer
Phase 6  Approval workflow + notifications
Phase 7  Reports + CSV export (server-side)
Phase 8  Profile, polish, a11y, empty/loading/error states
```

### 5. New assumptions (in addition to `.lovable/plan.md` §11)

A. You will apply every migration yourself against your dev Supabase project and confirm success before I build code that depends on the new schema.
B. You will regenerate `src/integrations/supabase/types.ts` after each applied migration and commit it; until then I code against the previously committed types.
C. Your dev Supabase project already has: `auth` schema enabled with email/password provider, `pgcrypto` available (needed for `gen_random_uuid()`), and permission to create custom schemas is not required (everything lives in `public` + `storage`).
D. Publishable key format: if your project issues new-format `sb_publishable_*` keys, the server publishable client will use the documented `fetch` shim (send `apikey` header only, strip default `Authorization: Bearer`) to avoid `Expected 3 parts in JWT` errors on PostgREST.
E. Production Supabase project is out of scope for now — only the dev project is connected. When you're ready for prod, we'll add a second set of secrets and a deploy checklist.

### 6. Next step

On approval I will:
1. Request the five Supabase secrets via the secure form.
2. Write the Supabase integration files (client, admin, auth-middleware, auth-attacher, placeholder types) and wire `src/start.ts`.
3. Write migrations `0001` and `0002` to `supabase/migrations/` and post them for your review — nothing applied to your database.

Reply "approve" to proceed, or tell me what to change.
