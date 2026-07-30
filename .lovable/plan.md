## Goal

Replace the hand-derived `src/integrations/supabase/database.types.ts` with the authoritative types generated from the dev Supabase project (pasted in chat), without breaking existing imports.

## What changes

**`src/integrations/supabase/database.types.ts`** — rewritten:

1. Keep the `Json` type export at the top (the generated block references `Json` in the `graphql_public.graphql` function args).
2. Replace the whole `export type Database = { ... }` body with the generated version verbatim, including `__InternalSupabase` and the `graphql_public` schema.
3. Re-append the helper aliases the app already relies on, adapted to the generated shape:
   - `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`, `Enums<T>` scoped to `Database["public"]`
   - plus `Constants` (the standard generated enum-values const) so future code can read enum values at runtime
4. Update the header comment: no longer "hand-derived" — note it is generated from project `jwydonacprzffqasxhav` and regenerated via `supabase gen types`.

## Notable differences from the current file

- `project_branding`, `project_members`, `running_timers`, and `time_entries` gain the full foreign-key relationship entries that were previously abbreviated.
- `Views` / `CompositeTypes` use the generated `{ [_ in never]: never }` form instead of `Record<string, never>`.
- Enum member ordering differs (no behavioural impact).
- No column/type mismatches were introduced — the generated schema matches the migrations, confirming they applied cleanly.

## Verification

Run a TypeScript-only typecheck to confirm nothing importing `Database`, `Tables<>`, or `Enums<>` broke — the Supabase clients (`client.ts`, `client.server.ts`, `auth-middleware.ts`) and `src/lib/environment.functions.ts` are the current consumers.

## After this

Next milestone is auth + the app shell: `/auth` sign-in/sign-up, the `_authenticated` layout gate, org context/switcher, and replacing the placeholder index route.
