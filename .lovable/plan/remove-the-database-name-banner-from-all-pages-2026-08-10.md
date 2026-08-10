# Remove the database-name banner from all pages

## Goal
Remove the persistent amber strip ("Development database — ...") that appears at the top of every page.

## Changes
1. `src/routes/__root.tsx`
   - Delete the `import { EnvironmentBanner } from "../components/EnvironmentBanner";` line.
   - Delete the `<EnvironmentBanner />` element from `RootComponent` (currently between `<AuthProvider>` and `<Outlet />`).
2. `src/components/EnvironmentBanner.tsx`
   - Delete the file entirely (no remaining references after the root edit).

## Out of scope
- No changes to `/admin/environment`, env config, or database connection logic — only the visible banner strip is removed.
