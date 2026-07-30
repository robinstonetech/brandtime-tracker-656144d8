import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireOrgRole } from "@/lib/org-access";
import {
  entrySchema,
  idSchema,
  orgSchema,
  startTimerSchema,
  updateEntrySchema,
  weekSchema,
} from "@/lib/schemas";
import { weekEndISO } from "@/lib/time-utils";

export type TimeEntry = {
  id: string;
  entryDate: string;
  durationMinutes: number;
  description: string | null;
  isBillable: boolean;
  projectId: string | null;
  projectName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  source: string;
  startedAt: string | null;
  endedAt: string | null;
  locked: boolean;
};

export type WeekTimesheet = {
  id: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  totalMinutes: number;
} | null;

export type WeekData = {
  weekStart: string;
  weekEnd: string;
  timesheet: WeekTimesheet;
  entries: TimeEntry[];
};

export type TimerState = {
  startedAt: string;
  projectId: string | null;
  categoryId: string | null;
  description: string | null;
} | null;

export type PickerOption = {
  id: string;
  name: string;
  isBillable?: boolean;
  projectId?: string | null;
};

/** Projects and categories available to the signed-in user for time entry. */
export const getTimeOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId);

    const [projects, categories] = await Promise.all([
      context.supabase
        .from("projects")
        .select("id, name, code, is_billable")
        .eq("organization_id", data.organizationId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name"),
      context.supabase
        .from("categories")
        .select("id, name, is_billable, project_id")
        .eq("organization_id", data.organizationId)
        .eq("is_active", true)
        .order("name"),
    ]);

    if (projects.error) throw new Error(projects.error.message);
    if (categories.error) throw new Error(categories.error.message);

    return {
      projects: (projects.data ?? []).map((p) => ({
        id: p.id,
        name: p.code ? `${p.code} — ${p.name}` : p.name,
        isBillable: p.is_billable,
      })) satisfies PickerOption[],
      categories: (categories.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        isBillable: c.is_billable,
      })) satisfies PickerOption[],
    };
  });

/** All of the signed-in user's entries for a week, plus the timesheet status. */
export const getWeek = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => weekSchema.parse(data))
  .handler(async ({ data, context }): Promise<WeekData> => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId);
    const weekEnd = weekEndISO(data.weekStart);

    const [timesheetResult, entriesResult] = await Promise.all([
      context.supabase
        .from("timesheets")
        .select("id, status, submitted_at, reviewed_at, review_note, total_minutes")
        .eq("organization_id", data.organizationId)
        .eq("user_id", context.userId)
        .eq("period_start", data.weekStart)
        .maybeSingle(),
      context.supabase
        .from("time_entries")
        .select(
          "id, entry_date, duration_minutes, description, is_billable, source, started_at, ended_at, project_id, category_id, projects(name, code), categories(name)",
        )
        .eq("organization_id", data.organizationId)
        .eq("user_id", context.userId)
        .gte("entry_date", data.weekStart)
        .lte("entry_date", weekEnd)
        .is("deleted_at", null)
        .order("entry_date")
        .order("created_at"),
    ]);

    if (timesheetResult.error) throw new Error(timesheetResult.error.message);
    if (entriesResult.error) throw new Error(entriesResult.error.message);

    const status = timesheetResult.data?.status ?? "draft";
    const locked = status === "submitted" || status === "approved";

    return {
      weekStart: data.weekStart,
      weekEnd,
      timesheet: timesheetResult.data
        ? {
            id: timesheetResult.data.id,
            status: timesheetResult.data.status,
            submittedAt: timesheetResult.data.submitted_at,
            reviewedAt: timesheetResult.data.reviewed_at,
            reviewNote: timesheetResult.data.review_note,
            totalMinutes: timesheetResult.data.total_minutes,
          }
        : null,
      entries: (entriesResult.data ?? []).map((row) => {
        const project = row.projects as unknown as { name: string; code: string | null } | null;
        const category = row.categories as unknown as { name: string } | null;
        return {
          id: row.id,
          entryDate: row.entry_date,
          durationMinutes: row.duration_minutes,
          description: row.description,
          isBillable: row.is_billable,
          projectId: row.project_id,
          projectName: project ? (project.code ? `${project.code} — ${project.name}` : project.name) : null,
          categoryId: row.category_id,
          categoryName: category?.name ?? null,
          source: row.source,
          startedAt: row.started_at,
          endedAt: row.ended_at,
          locked,
        };
      }),
    };
  });

export const getRunningTimer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgSchema.parse(data))
  .handler(async ({ data, context }): Promise<TimerState> => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId);

    const { data: timer, error } = await context.supabase
      .from("running_timers")
      .select("started_at, project_id, category_id, description, organization_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!timer || timer.organization_id !== data.organizationId) return null;

    return {
      startedAt: timer.started_at,
      projectId: timer.project_id,
      categoryId: timer.category_id,
      description: timer.description,
    };
  });

/** Starts a timer. Only one may run per user, so any existing one is replaced. */
export const startTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => startTimerSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId);

    const { error } = await context.supabase.from("running_timers").upsert(
      {
        user_id: context.userId,
        organization_id: data.organizationId,
        project_id: data.projectId ?? null,
        category_id: data.categoryId ?? null,
        description: data.description ?? null,
        started_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Stops the running timer and converts it into a time entry (minimum 1 minute). */
export const stopTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId);

    const { data: timer, error } = await context.supabase
      .from("running_timers")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!timer) throw new Error("No timer is running");

    const startedAt = new Date(timer.started_at);
    const endedAt = new Date();
    const minutes = Math.min(
      1440,
      Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)),
    );

    const entryDate = `${startedAt.getFullYear()}-${`${startedAt.getMonth() + 1}`.padStart(2, "0")}-${`${startedAt.getDate()}`.padStart(2, "0")}`;

    const { error: insertError } = await context.supabase.from("time_entries").insert({
      organization_id: timer.organization_id,
      user_id: context.userId,
      project_id: timer.project_id,
      category_id: timer.category_id,
      entry_date: entryDate,
      duration_minutes: minutes,
      started_at: timer.started_at,
      ended_at: endedAt.toISOString(),
      description: timer.description,
      source: "timer",
    });
    if (insertError) throw new Error(insertError.message);

    const { error: deleteError } = await context.supabase
      .from("running_timers")
      .delete()
      .eq("user_id", context.userId);
    if (deleteError) throw new Error(deleteError.message);

    return { minutes, entryDate };
  });

export const cancelTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("running_timers")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createTimeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entrySchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId);

    const { error } = await context.supabase.from("time_entries").insert({
      organization_id: data.organizationId,
      user_id: context.userId,
      entry_date: data.entryDate,
      duration_minutes: data.durationMinutes,
      project_id: data.projectId ?? null,
      category_id: data.categoryId ?? null,
      description: data.description ?? null,
      is_billable: data.isBillable,
      source: "manual",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTimeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateEntrySchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId);

    const { error } = await context.supabase
      .from("time_entries")
      .update({
        entry_date: data.entryDate,
        duration_minutes: data.durationMinutes,
        project_id: data.projectId ?? null,
        category_id: data.categoryId ?? null,
        description: data.description ?? null,
        is_billable: data.isBillable,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTimeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("time_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Creates (or reuses) the week's timesheet, attaches its entries and submits it. */
export const submitWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => weekSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId);
    const weekEnd = weekEndISO(data.weekStart);

    const { data: existing, error: readError } = await context.supabase
      .from("timesheets")
      .select("id, status")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .eq("period_start", data.weekStart)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    if (existing && (existing.status === "submitted" || existing.status === "approved")) {
      throw new Error("This week has already been submitted");
    }

    let timesheetId = existing?.id ?? null;
    if (!timesheetId) {
      const { data: created, error: createError } = await context.supabase
        .from("timesheets")
        .insert({
          organization_id: data.organizationId,
          user_id: context.userId,
          period_start: data.weekStart,
          period_end: weekEnd,
        })
        .select("id")
        .single();
      if (createError || !created) throw new Error(createError?.message ?? "Could not create timesheet");
      timesheetId = created.id;
    }

    const { error: attachError } = await context.supabase
      .from("time_entries")
      .update({ timesheet_id: timesheetId })
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .gte("entry_date", data.weekStart)
      .lte("entry_date", weekEnd)
      .is("deleted_at", null);
    if (attachError) throw new Error(attachError.message);

    const { error: submitError } = await context.supabase
      .from("timesheets")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        review_note: null,
        reviewed_at: null,
        reviewed_by: null,
      })
      .eq("id", timesheetId)
      .eq("user_id", context.userId);
    if (submitError) throw new Error(submitError.message);

    return { timesheetId };
  });
