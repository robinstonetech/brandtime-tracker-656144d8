
# Robinstone Business Suite - Time — Architecture & Foundation Plan

This is the **foundation deliverable**. No migrations or feature code are written until you approve the schema, RLS strategy, and assumptions below. Once approved, implementation proceeds in numbered phases.

---

## 1. Overall Application Architecture

- **Frontend**: React + TypeScript on TanStack Start (Vite). Tailwind v4 + shadcn/ui. TanStack Query for server cache, React Hook Form + Zod for forms.
- **Backend**: Supabase (dev project only) — Postgres, Auth, Storage, and `createServerFn` server functions in TanStack Start for privileged/business logic (no Supabase Edge Functions — TanStack Start's server runtime replaces them).
- **Email**: Mailtrap Sandbox in dev, Mailtrap Sending API in production, selected via env (`MAILTRAP_MODE`, `MAILTRAP_API_TOKEN`, `MAILTRAP_INBOX_ID`, `MAILTRAP_FROM`). All sends happen server-side in a `sendEmail()` helper.
- **Multi-tenancy**: Single database, `organization_id` on every tenant table, isolation enforced by RLS via a `has_org_role()` security-definer helper.
- **State/branding**: Active org + resolved theme kept in a React context, hydrated from `useSuspenseQuery`. Branding renders as CSS variables injected into `<html>` — no reload on org/project switch.
- **Source of truth**: GitHub. Every schema change is a versioned SQL migration file.

## 2. Authentication Design

- Supabase email + password only (per your answer).
- Hybrid onboarding:
  - **Self-serve signup** → creates `auth.users` row, then `organizations` row, then `memberships` row with role `administrator`. Wrapped in one `handle_new_org_signup()` RPC.
  - **Invite flow** → Admin/Manager sends invite → `invitations` row (token, email, org, role, expiry). Recipient clicks emailed link → signs up or signs in → server fn `accept_invitation(token)` creates the membership.
- Password reset via `resetPasswordForEmail` → `/reset-password` public route calling `updateUser({ password })`.
- Route gating: protected app lives under `src/routes/_authenticated/` (integration-managed layout). Public routes: `/`, `/auth`, `/reset-password`, `/invite/$token`.

## 3. Authorization Model

Three roles per membership (a user may belong to multiple orgs, one role per org):

| Role          | Scope of authority                                                                 |
| ------------- | ---------------------------------------------------------------------------------- |
| administrator | Full control of their org: settings, branding, users, projects, all timesheets     |
| manager       | Approve/reject timesheets for employees on projects they manage; read org reports  |
| employee      | Own timesheets, own profile, view assigned projects/categories                     |

Enforcement via SQL security-definer helpers (avoid recursive RLS):

- `current_org_id()` — resolves org from JWT/session context (set per-request via a claims strategy or from `memberships` lookup)
- `has_org_role(_user uuid, _org uuid, _role app_role) returns boolean`
- `is_org_member(_user uuid, _org uuid) returns boolean`
- `manages_project(_user uuid, _project uuid) returns boolean`

Every RLS policy uses these — no `USING (true)`.

## 4. Branding Architecture

- **Organization branding**: one `organization_branding` row per org — colors, fonts, logo/favicon storage paths, light/dark palette, optional `custom_css_vars` JSONB.
- **Project branding**: optional `project_branding` row per project — overrides subset (logo, icon, primary, accent, header image).
- Runtime resolver: `resolveTheme(org, project?, mode)` → flat CSS-var map → injected on `<html>` via `<style id="brand-vars">`. Components consume tokens only (no hardcoded colors).
- Storage buckets:
  - `org-branding` (public) — logos, favicons
  - `project-branding` (public) — project logos, header images
  - `avatars` (public) — user avatars
  - `exports` (private) — generated CSV reports
- Mode selection: user preference (light / dark / auto) stored on profile.

## 5. Navigation Structure

```text
/                              public landing (marketing + Sign in CTA)
/auth                          sign in / sign up (tabs)
/reset-password                password reset
/invite/$token                 accept invitation
/_authenticated/
  dashboard                    KPIs, running timer, week summary
  timesheets/                  list, /$weekId edit, /new
  timer                        full-screen running timer
  projects/                    list, /$id detail, /$id/categories, /$id/members, /$id/branding
  approvals                    manager/admin queue
  reports                      filters + tables + CSV export
  employees                    admin/manager: invite, roles, assignments
  settings/                    org general, branding, members, danger zone
  profile                      user profile + theme preference
```

## 6. Folder Structure

```text
src/
  routes/                      TanStack file routes (as above)
  components/
    ui/                        shadcn primitives
    branding/                  ThemeProvider, BrandVarsInjector
    timesheets/                WeeklyGrid, EntryDialog
    timer/                     RunningTimer, TimerControls
    reports/                   ReportFilters, ReportTable
    layout/                    AppShell, Sidebar, Topbar
  lib/
    *.functions.ts             createServerFn wrappers (auth-required)
    *.server.ts                server-only helpers (mailtrap, csv, admin ops)
    theme/                     resolveTheme, cssVarMap
    validation/                zod schemas shared client/server
  integrations/supabase/       generated client, auth-middleware, types
  hooks/
  styles.css
supabase/migrations/           versioned SQL (created after approval)
```

## 7. Database Schema (normalized, expansion-ready)

Enums:
- `app_role`: administrator | manager | employee
- `timesheet_status`: draft | submitted | approved | rejected | returned
- `project_status`: planning | active | on_hold | completed | archived
- `theme_mode`: light | dark | auto
- `invitation_status`: pending | accepted | revoked | expired

Core tables (all with `id uuid pk`, `created_at`, `updated_at`, `created_by`, `updated_by` audit fields; `updated_at` maintained by trigger):

- **organizations** (name, slug unique, timezone, week_start_day, default_currency, is_active)
- **organization_branding** (organization_id fk unique, all color/font/logo fields, light+dark palette JSONB, custom_css_vars JSONB)
- **profiles** (id = auth.users.id, full_name, email, avatar_url, theme_preference, default_organization_id)
- **memberships** (user_id, organization_id, role app_role, is_active, unique(user_id, organization_id))
- **invitations** (organization_id, email, role, token unique, invited_by, expires_at, status)
- **projects** (organization_id, name, code, description, customer_id nullable [future], status, billing_rate_cents, currency, start_date, end_date, is_active, is_archived, unique(organization_id, code))
- **project_branding** (project_id fk unique, logo/icon/header paths, primary/accent overrides)
- **project_members** (project_id, user_id, is_manager, unique(project_id, user_id))
- **project_categories** (project_id, name, description, billing_rate_cents nullable, is_active, unique(project_id, name))
- **time_entries** (organization_id, user_id, project_id, category_id, work_date, start_time timestamptz nullable, end_time timestamptz nullable, break_minutes int, duration_minutes int not null check ≥0, notes, is_billable, timesheet_id nullable, source enum{manual,timer})
- **timesheets** (organization_id, user_id, week_start_date, status, submitted_at, decided_at, decided_by, notes, unique(user_id, week_start_date))
- **timesheet_events** (timesheet_id, actor_id, action, from_status, to_status, note) — audit trail
- **running_timers** (user_id pk, organization_id, project_id, category_id, started_at, note) — one active timer per user enforced by PK on user_id
- **audit_log** (organization_id, actor_id, entity_type, entity_id, action, diff jsonb) — cross-cutting

Future placeholders reserved via nullable FKs / stub tables (created empty, RLS-locked): `customers`, `invoices`, `payroll_runs`, `expenses`, `purchase_orders`, `assets`, `tasks`, `documents`. Only `customers` is stubbed in phase 1 to satisfy `projects.customer_id`.

Indexes: FKs, `time_entries(user_id, work_date)`, `time_entries(organization_id, work_date)`, `time_entries(project_id, work_date)`, `timesheets(organization_id, status)`, `invitations(token)`, `memberships(user_id)`.

Views (server-side reporting):
- `v_time_entries_enriched` — join to project/category/user/org
- `v_daily_totals`, `v_weekly_totals`, `v_project_summary`, `v_employee_summary`, `v_category_summary`

Functions:
- `handle_new_org_signup(org_name text)` — creates org + membership for `auth.uid()`
- `accept_invitation(token text)` — validates + creates membership
- `submit_timesheet(week_id uuid)` / `decide_timesheet(week_id, decision, note)` — state machine + `timesheet_events` insert
- `start_timer / stop_timer` — enforces single active timer; on stop creates a `time_entries` row
- Trigger: `set_updated_at`, `set_audit_actor`, `prevent_delete_projects_with_entries`

## 8. RLS Strategy

- RLS enabled on **every** app table.
- Grants: `authenticated` gets SELECT/INSERT/UPDATE/DELETE where policies allow; `anon` gets nothing on tenant tables; `service_role` gets ALL.
- Pattern per table:
  - SELECT: `is_org_member(auth.uid(), organization_id)` + row-specific narrowing (employees see own; managers see managed projects; admins see all in org).
  - INSERT/UPDATE: role check via `has_org_role` + ownership check.
  - DELETE: admin-only, and blocked by trigger where history matters (projects with entries, submitted timesheets).
- `memberships` uses `has_org_role` (SECURITY DEFINER) — never self-joins in a policy.
- No `USING (true)`. No role checks in the client.

## 9. Migration Plan (order)

```text
0001_extensions_and_enums.sql
0002_helpers_and_audit.sql             -- updated_at trigger, audit helpers, security-definer fns skeleton
0003_organizations_and_branding.sql
0004_profiles_memberships_invitations.sql
0005_security_definer_functions.sql    -- has_org_role, is_org_member, manages_project, current_org_id
0006_projects_categories_members.sql
0007_project_branding.sql
0008_timesheets_and_entries.sql
0009_running_timers.sql
0010_reporting_views.sql
0011_rls_policies.sql                  -- all policies + grants, one place for review
0012_storage_buckets_and_policies.sql  -- called via storage tool for buckets, SQL for storage.objects
0013_seed_lookup_data.sql              -- enum-adjacent lookups only, no demo data
```

## 10. Build Phases (post-approval)

1. Migrations 0001–0013 + generated Supabase types.
2. Auth + onboarding + invitations + email helper (Mailtrap sandbox/prod switch).
3. Branding engine + ThemeProvider + Org settings/branding UI.
4. Projects, categories, member assignment.
5. Time entry + weekly timesheet grid + running timer.
6. Approval workflow + notifications.
7. Reports + CSV export (server-side).
8. Profile, polish, empty/loading/error states, a11y pass.

## 11. Assumptions Requiring Approval

1. **Domain / hosting**: `myTimesheets.app` is configured outside Lovable; app is deployed via Lovable and DNS pointed later.
2. **Mailtrap production key**: you will supply `MAILTRAP_API_TOKEN` (prod) and `MAILTRAP_SANDBOX_TOKEN` + `MAILTRAP_INBOX_ID` (dev) via secure secret entry when we reach the email phase.
3. **Users belong to multiple orgs**; the active org is chosen via an org switcher and stored in profile `default_organization_id`.
4. **Week definition** is per-org (`week_start_day`, default Monday); timesheet weeks derived from that.
5. **Time storage**: `duration_minutes` int is authoritative; `start_time`/`end_time` are optional metadata (populated by timer, optional for manual entries).
6. **Billing rate** stored as integer cents; currency per project inherits from org default.
7. **Single active timer per user** (your answer) — enforced by PK on `running_timers.user_id`.
8. **No payroll now**, but `payroll_runs` will later reference `time_entries.id`s snapshotted at approval — nothing needed in phase 1 beyond keeping `time_entries` append-friendly after approval (immutability enforced by trigger once `timesheet.status = approved`).
9. **Storage**: logos/avatars in public buckets (needed for `<img src>` in exports/emails); CSV exports in private bucket with signed URLs. If your workspace blocks public buckets, we'll switch logos to signed URLs.
10. **Deletion policy**: soft-delete (archive) for orgs, projects, categories, users (membership `is_active=false`). Hard delete only via admin tool + audit entry.
11. **Custom domain per org / white-label** is out of scope for phase 1 (branding only, single host).
12. **Timezone**: entries store `work_date` in the org's timezone; timestamps in UTC.

---

Reply with approval or edits (e.g. "approve", "change #4 to Sunday start", "add magic link auth"). I'll revise or proceed to migration 0001.
