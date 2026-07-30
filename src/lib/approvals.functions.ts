import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireOrgRole } from "@/lib/org-access";
import { orgSchema, reviewSchema } from "@/lib/schemas";

export type ApprovalRow = {
  id: string;
  userId: string;
  memberName: string;
  memberEmail: string;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  totalMinutes: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type ApprovalDetailEntry = {
  id: string;
  entryDate: string;
  durationMinutes: number;
  description: string | null;
  isBillable: boolean;
  projectName: string | null;
  categoryName: string | null;
};

/** Timesheets the signed-in manager/admin can review. */
export const getApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgSchema.parse(data))
  .handler(async ({ data, context }) => {
    const role = await requireOrgRole(
      context.supabase,
      context.userId,
      data.organizationId,
      "manager",
    );

    const { data: rows, error } = await context.supabase
      .from("timesheets")
      .select(
        "id, user_id, period_start, period_end, status, total_minutes, submitted_at, reviewed_at, review_note",
      )
      .eq("organization_id", data.organizationId)
      .neq("status", "draft")
      .order("submitted_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    const visible = (rows ?? []).filter(
      (row) => row.user_id !== context.userId || role === "owner" || role === "admin",
    );

    const userIds = [...new Set(visible.map((row) => row.user_id))];
    const profileMap = new Map<string, { full_name: string | null; email: string }>();
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await context.supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      if (profileError) throw new Error(profileError.message);
      for (const profile of profiles ?? []) {
        profileMap.set(profile.id, { full_name: profile.full_name, email: profile.email });
      }
    }

    const timesheets: ApprovalRow[] = visible.map((row) => {
      const profile = profileMap.get(row.user_id) ?? null;
      return {
        id: row.id,
        userId: row.user_id,
        memberName: profile?.full_name ?? profile?.email ?? "Unknown",
        memberEmail: profile?.email ?? "",
        periodStart: row.period_start,
        periodEnd: row.period_end,
        status: row.status,
        totalMinutes: row.total_minutes,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        reviewNote: row.review_note,
      };
    });


    return { role, timesheets };
  });

export const getApprovalDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reviewSchema.pick({ timesheetId: true }).parse(data))
  .handler(async ({ data, context }): Promise<ApprovalDetailEntry[]> => {
    const { data: sheet, error: sheetError } = await context.supabase
      .from("timesheets")
      .select("organization_id")
      .eq("id", data.timesheetId)
      .maybeSingle();
    if (sheetError) throw new Error(sheetError.message);
    if (!sheet) throw new Error("Timesheet not found");

    await requireOrgRole(context.supabase, context.userId, sheet.organization_id, "manager");

    const { data: entries, error } = await context.supabase
      .from("time_entries")
      .select(
        "id, entry_date, duration_minutes, description, is_billable, projects(name, code), categories(name)",
      )
      .eq("timesheet_id", data.timesheetId)
      .is("deleted_at", null)
      .order("entry_date");
    if (error) throw new Error(error.message);

    return (entries ?? []).map((row) => {
      const project = row.projects as unknown as { name: string; code: string | null } | null;
      const category = row.categories as unknown as { name: string } | null;
      return {
        id: row.id,
        entryDate: row.entry_date,
        durationMinutes: row.duration_minutes,
        description: row.description,
        isBillable: row.is_billable,
        projectName: project ? (project.code ? `${project.code} — ${project.name}` : project.name) : null,
        categoryName: category?.name ?? null,
      };
    });
  });

/** Approve or reject a submitted timesheet. Reviewers cannot approve their own. */
export const reviewTimesheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: sheet, error: sheetError } = await context.supabase
      .from("timesheets")
      .select("organization_id, user_id, status")
      .eq("id", data.timesheetId)
      .maybeSingle();
    if (sheetError) throw new Error(sheetError.message);
    if (!sheet) throw new Error("Timesheet not found");

    await requireOrgRole(context.supabase, context.userId, sheet.organization_id, "manager");

    if (sheet.user_id === context.userId) {
      throw new Error("You cannot review your own timesheet");
    }
    if (sheet.status !== "submitted") {
      throw new Error("Only submitted timesheets can be reviewed");
    }
    if (data.decision === "rejected" && !data.note?.trim()) {
      throw new Error("Add a note explaining the rejection");
    }

    const { error } = await context.supabase
      .from("timesheets")
      .update({
        status: data.decision,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
        review_note: data.note?.trim() || null,
      })
      .eq("id", data.timesheetId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
