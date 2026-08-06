# Single database: development only

Remove all database-switching machinery. Every host — preview, localhost, myTimesheets.app — connects to the development Supabase project (`jwydonacprzffqasxhav`).

## Changes

**Environment registry (`src/integrations/supabase/environments.ts`)**
- Delete the `production` entry, `PRODUCTION_HOSTS`, and `ENV_OVERRIDE_STORAGE_KEY`.
- Narrow `SupabaseEnvironmentName` to `"development"`.
- Simplify `resolveEnvironmentName` to always return `"development"` (drop host/explicit/override logic).

**Client config (`src/integrations/supabase/config.ts`)**
- Remove `readOverride` and `setEnvironmentOverride`; keep `createOpaqueKeyFetch` and `getBrowserEnvironment`.

**Server resolver (`src/integrations/supabase/environment.server.ts`)**
- Drop host-header inspection and `SUPABASE_ENV`; return the development environment directly. `getServiceRoleKey` stays (`EXT_SUPABASE_SERVICE_ROLE_KEY`).

**Environment page (`src/routes/admin/environment.tsx`)**
- Remove the "Switch database" card, switch handler, and switching state.
- Keep the active-connection card with health checks; trim the promotion-workflow card to dev-only guidance.
- Update page meta text (no more "switch between development and production").

**Banner (`src/components/EnvironmentBanner.tsx`)**
- Remove the production check; always show the development strip.

**Status server fn (`src/lib/environment.functions.ts`)**
- Narrow the `name` field type to `"development"`.

## Notes

Any browser that previously stored an override key keeps a stale localStorage value; it is simply ignored once the override code is gone. The production Supabase project and `PROD_SUPABASE_SERVICE_ROLE_KEY` secret are untouched — only the app's references disappear.
