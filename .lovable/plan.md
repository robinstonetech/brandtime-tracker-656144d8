## Goal

Turn the four placeholder pages (Timesheets, Projects, Team, Dashboard) into working features on top of the existing auth, workspace and branding foundation, using the tables already applied to the dev database.

## Phase 1 — Time entry and timesheets

**Timer + entries**
- Server functions in `src/lib/time.functions.ts`: start timer, stop timer (converts to a time entry), read current running timer, create/update/delete manual entries, list entries for a week.
- One active timer per user, enforced server-side: starting a new timer stops any existing one.
- Duration stored as integer minutes; the UI shows hours/minutes.

**Weekly timesheet page (`/timesheets`)**
- Week picker with previous/next navigation and a "this week" shortcut.
- Sticky timer bar: project + category selector, notes, start/stop, live elapsed counter.
- Day-by-day list of entries grouped by date, with inline edit and delete, plus a manual "add entry" dialog (project, category, date, duration or start/end, billable flag, notes).
- Weekly total, per-project subtotals, and billable vs non-billable split.
- Submit for approval: locks the week's entries and sets the timesheet to submitted.

## Phase 2 — Timesheet approval

- Approvals queue visible to managers, admins and owners (role from the active membership).
- List of submitted timesheets: person, week, total hours, submitted date.
- Detail view showing every entry in the week, with Approve or Reject plus a required note on rejection.
- Approval writes status, approver and timestamp; rejected weeks unlock so the member can correct and resubmit.
- Status badges (draft / submitted / approved / rejected) surfaced on the member's own timesheet page.

## Phase 3 — Projects

- `/projects` list with search, status filter, client, and archived toggle.
- Create and edit projects: name, code, client, status, billable default, hourly rate, start/end dates, colour.
- Client management (create, rename, archive) inside the same page as a secondary tab.
- Categories (task types) managed per organization so time entries can be classified.
- Project members: assign people to a project, controlling what appears in the timer's project picker.
- Archiving instead of hard delete, keeping historical entries intact.

## Phase 4 — Team

- `/team` member list: name, email, role, job title, status, last activity.
- Invite by email with a role selector; invitation rows created with a token and expiry.
- Pending invitations list with resend and revoke.
- Role changes and deactivation, restricted to admins and owners, with the last owner protected.
- An accept-invitation route so an invited user can join after signing up.

## Phase 5 — Dashboard

Replace the placeholder numbers with real data: hours this week vs target, active timer state, recent entries, per-project breakdown for the week, and a manager-only card for timesheets awaiting approval.

## Technical notes

- All data access goes through `createServerFn` with `requireSupabaseAuth`, scoped by the active organization id passed from the client and re-verified server-side against the caller's memberships — never trusting the client's claim alone.
- Reads use TanStack Query with query keys namespaced by organization; mutations invalidate the affected keys.
- Forms use React Hook Form + Zod, sharing schemas between client validation and server `inputValidator`.
- Role gates in the UI mirror the database RLS policies; the server re-checks role with `has_min_role` for every privileged action.
- Email sending for invitations is stubbed behind a single function until Mailtrap is wired, so the flow works end to end without the provider.
- New shadcn components as needed (table, dialog, select, tabs, calendar/date picker); no new theme colours — everything uses existing semantic tokens.

## Assumptions

- Approval is single-step (one approver, no multi-level chain).
- The week starts Monday and follows the organization's timezone.
- Members can edit their own entries only while a week is draft or rejected.
- Mailtrap wiring is a separate follow-up step.

## Suggested order

Phase 1 first since everything else depends on entries existing, then Projects (needed to make the timer useful), then Team, then Approval, then Dashboard. I can also do them in the listed order if you prefer approval earlier.
