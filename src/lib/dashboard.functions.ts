import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireOrgRole, roleAtLeast } from "@/lib/org-access";
import { weekSchema } from "@/lib/schemas";
import { weekEndISO } from "@/lib/time-utils";

export type DashboardData = {
  role: "owner" | "admin" | "manager" | "member";
  weekMinutes: number;
  billableMinutes: number;
  daysLogged: number;
  weekStatus: "draft" | "submitted" | "approved" | "rejected";
  perDay: { date: string; minutes: number }[];
  topProjects: { name: string; minutes: number }[];
  pendingApprovals: number;
  activeProjects: number;
  teamSize: number;
};

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => weekSchema.parse(data))
  .handler(async ({ data, context }): Promise<DashboardData> => {
    const role = await requireOrgRole(context.supabase, context.userId, data.organizationId);
    const weekEnd = weekEndISO(data.weekStart);
    const isReviewer = roleAtLeast(role, "manager");

    const [entriesResult, sheetResult, approvalsResult, projectsResult, teamResult] =
      await Promise.all([
        context.supabase
          .from("time_entries")
          .select("entry_date, duration_minutes, is_billable, projects(name, code)")
          .eq("organization_id", data.organizationId)
          .eq("user_id", context.userId)
          .gte("entry_date", data.weekStart)
          .lte("entry_date", weekEnd)
          .is("deleted_at", null),
        context.supabase
          .from("timesheets")
          .select("status")
          .eq("organization_id", data.organizationId)
          .eq("user_id", context.userId)
          .eq("period_start", data.weekStart)
          .maybeSingle(),
        isReviewer
          ? context.supabase
              .from("timesheets")
              .select("id", { count: "exact", head: true })
              .eq("organization_id", data.organizationId)
              .eq("status", "submitted")
          : Promise.resolve({ count: 0, error: null } as const),
        context.supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", data.organizationId)
          .eq("status", "active")
          .is("deleted_at", null),
        context.supabase
          .from("memberships")
          .select("user_id", { count: "exact", head: true })
          .eq("organization_id", data.organizationId)
          .eq("is_active", true),
      ]);

    if (entriesResult.error) throw new Error(entriesResult.error.message);

    const entries = entriesResult.data ?? [];
    const perDayMap = new Map<string, number>();
    const projectMap = new Map<string, number>();
    let weekMinutes = 0;
    let billableMinutes = 0;

    for (const row of entries) {
      weekMinutes += row.duration_minutes;
      if (row.is_billable) billableMinutes += row.duration_minutes;
      perDayMap.set(row.entry_date, (perDayMap.get(row.entry_date) ?? 0) + row.duration_minutes);
      const project = row.projects as unknown as { name: string; code: string | null } | null;
      const label = project?.name ?? "Unassigned";
      projectMap.set(label, (projectMap.get(label) ?? 0) + row.duration_minutes);
    }

    return {
      role,
      weekMinutes,
      billableMinutes,
      daysLogged: perDayMap.size,
      weekStatus: sheetResult.data?.status ?? "draft",
      perDay: [...perDayMap.entries()]
        .map(([date, minutes]) => ({ date, minutes }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topProjects: [...projectMap.entries()]
        .map(([name, minutes]) => ({ name, minutes }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 5),
      pendingApprovals: approvalsResult.count ?? 0,
      activeProjects: projectsResult.count ?? 0,
      teamSize: teamResult.count ?? 0,
    };
  });
