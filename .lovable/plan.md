## Goal

Run the same codebase against your **development** Supabase project while building/testing, and against your **production** Supabase project once published on myTimesheets.app — with a visible indicator and a safe way to switch.

## Recommendation (important)

A true "toggle the database from the Admin UI in production" switch is not safe and I don't recommend it as the primary mechanism:

- The service-role key lives server-side; a browser toggle can't change what the server uses without shipping both keys or storing a database-selecting value that any admin session could flip.
- Supabase auth sessions are per-project. Switching projects mid-session invalidates the signed-in user, JWTs, invitations, and storage URLs.
- One wrong click in production points live users at dev data (or worse, dev testing at real customer data).

The safe, standard approach is **environment-resolved connection, chosen automatically by where the app is running**, plus a **read-only Admin panel** showing which project is active, and a **dev-only override** for testing.

## How the switch works

Resolution order in `src/integrations/supabase/config.ts` (rewritten as an environment resolver):

```text
1. Explicit env vars      VITE_SUPABASE_ENV = "development" | "production"
2. Hostname fallback      myTimesheets.app / www.myTimesheets.app  -> production
                          *.lovable.app, localhost, previews       -> development
3. Dev-only override      localStorage key, honored ONLY when the
                          resolved env is development (never in prod)
```

Each environment is a small record: `{ label, url, publishableKey, serviceRoleSecretName }`. Dev values stay in code (publishable, safe). Production URL + publishable key get added when you're ready; the production service-role key is stored as a second secret (`PROD_SUPABASE_SERVICE_ROLE_KEY`).

Server side (`client.server.ts`, `auth-middleware.ts`) resolves the same environment from the incoming request host — so a request to myTimesheets.app always uses prod keys, and a preview request always uses dev keys. Server and client can never disagree.

## Admin UI

New page **Admin → Environment** (`/_authenticated/admin/environment`), visible to org owners/admins:

- Current environment badge (DEVELOPMENT amber / PRODUCTION green), project ref, and API URL.
- Connection health check (round-trip through a server function) for both client and service-role paths.
- Applied migration list read from the target project, so you can see dev vs prod drift.
- **Switch environment** control that only renders when running in a development build; switching signs the user out (session is project-bound), writes the override, and reloads. In production it renders a disabled control with an explanation.

A persistent thin banner ("Development database") shows on every page when not in production, so it's impossible to mistake dev for live.

## Testing and deployment workflow

1. **Build & test in Lovable preview** — always dev project. Seed/reset freely.
2. **Write migrations** to `supabase/migrations/*.sql` (timestamp-prefixed, forward-only). Apply to dev with the Supabase CLI, verify, regenerate types.
3. **Promote** — apply the exact same migration files to prod (`supabase link` to the prod ref, then `supabase db push`). Nothing hand-run in the prod SQL editor, so the two projects stay identical.
4. **Publish** the app; the published host resolves to the production project automatically.
5. **Verify** on myTimesheets.app via the Admin → Environment page: badge reads PRODUCTION, migration list matches dev.
6. **Rollback** is a new forward migration; never edit an applied file.

Mailtrap follows the same resolver: Sandbox in development, Sending in production.

## Technical changes

- `src/integrations/supabase/environments.ts` — environment table + `resolveEnvironment(host, override)`.
- `config.ts` — becomes environment-aware; keeps the opaque-`sb_` key fetch shim.
- `client.ts` — builds the browser client from the resolved environment; storage key namespaced per environment so dev and prod sessions don't collide.
- `client.server.ts` / `auth-middleware.ts` — host-resolved keys, service-role secret picked per environment.
- `src/lib/environment.functions.ts` — server fn returning active environment metadata + health + applied migrations (admin-gated).
- `src/components/EnvironmentBanner.tsx`, admin environment route.
- Secrets to add later: production publishable key can live in code; `PROD_SUPABASE_SERVICE_ROLE_KEY` via the secure form.

## Assumptions to confirm

- Production is a **separate Supabase project** (not a schema in the same project).
- myTimesheets.app is the only production host; Lovable preview + localhost are development.
- Switching environments signing the user out is acceptable (it's unavoidable).
