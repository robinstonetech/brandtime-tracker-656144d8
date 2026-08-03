import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireOrgRole } from "@/lib/org-access";
import { orgIdSchema, orgSchema, taskSchema, taskStatusSchema } from "@/lib/schemas";
import type { MyTaskGroup, TaskRow } from "@/lib/tasks-types";
import { loadTasks } from "@/lib/tasks.server";

export type { MyTaskGroup, TaskRow };

/** All tasks in the organization, for the projects screen. */
export const getTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgSchema.parse(data))
  .handler(async ({ data, context }): Promise<TaskRow[]> => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId);
    const { tasks, assigneesByTask, projectNames, categoryNames } = await loadTasks(
      context.supabase,
      data.organizationId,
    );

    const { data: entries, error: entriesError } = await context.supabase
      .from("time_entries")
      .select("task_id, duration_minutes")
      .eq("organization_id", data.organizationId)
      .not("task_id", "is", null)
      .is("deleted_at", null);
    if (entriesError) throw new Error(entriesError.message);

    const minutesByTask = new Map<string, number>();
    for (const row of entries ?? []) {
      if (!row.task_id) continue;
      minutesByTask.set(row.task_id, (minutesByTask.get(row.task_id) ?? 0) + row.duration_minutes);
    }

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status === "done" ? ("done" as const) : ("open" as const),
      dueOn: task.due_on,
      projectId: task.project_id,
      projectName: projectNames.get(task.project_id) ?? "Unknown project",
      categoryId: task.category_id,
      categoryName: categoryNames.get(task.category_id) ?? "Unknown category",
      assigneeIds: assigneesByTask.get(task.id) ?? [],
      loggedMinutes: minutesByTask.get(task.id) ?? 0,
    }));
  });

/** Open tasks assigned to the caller (or unassigned), grouped by project + category. */
export const getMyTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgSchema.parse(data))
  .handler(async ({ data, context }): Promise<MyTaskGroup[]> => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId);
    const { tasks, assigneesByTask, projectNames, categoryNames } = await loadTasks(
      context.supabase,
      data.organizationId,
    );

    const groups = new Map<string, MyTaskGroup>();

    for (const task of tasks) {
      if (task.status !== "open") continue;
      const assignees = assigneesByTask.get(task.id) ?? [];
      const assigned = assignees.includes(context.userId);
      if (assignees.length > 0 && !assigned) continue;

      let group = groups.get(task.project_id);
      if (!group) {
        group = {
          projectId: task.project_id,
          projectName: projectNames.get(task.project_id) ?? "Unknown project",
          categories: [],
        };
        groups.set(task.project_id, group);
      }

      let category = group.categories.find((item) => item.categoryId === task.category_id);
      if (!category) {
        category = {
          categoryId: task.category_id,
          categoryName: categoryNames.get(task.category_id) ?? "Unknown category",
          tasks: [],
        };
        group.categories.push(category);
      }

      category.tasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        dueOn: task.due_on,
        projectId: task.project_id,
        categoryId: task.category_id,
        assigned,
      });
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        categories: group.categories.sort((a, b) => a.categoryName.localeCompare(b.categoryName)),
      }))
      .sort((a, b) => a.projectName.localeCompare(b.projectName));
  });

export const saveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => taskSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId, "manager");

    const { data: category, error: categoryError } = await context.supabase
      .from("categories")
      .select("id, project_id")
      .eq("id", data.categoryId)
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    if (categoryError) throw new Error(categoryError.message);
    if (!category) throw new Error("Category not found in this organization");
    if (category.project_id !== data.projectId) {
      throw new Error("That category belongs to a different project");
    }

    const payload = {
      organization_id: data.organizationId,
      project_id: data.projectId,
      category_id: data.categoryId,
      title: data.title,
      description: data.description?.trim() ? data.description.trim() : null,
      status: data.status,
      due_on: data.dueOn ? data.dueOn : null,
    };

    let taskId = data.id ?? null;
    if (taskId) {
      const { error } = await context.supabase
        .from("tasks")
        .update(payload)
        .eq("id", taskId)
        .eq("organization_id", data.organizationId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await context.supabase
        .from("tasks")
        .insert({ ...payload, created_by: context.userId })
        .select("id")
        .single();
      if (error || !created) throw new Error(error?.message ?? "Could not create task");
      taskId = created.id;
    }

    const { error: clearError } = await context.supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId);
    if (clearError) throw new Error(clearError.message);

    if (data.assigneeIds.length > 0) {
      const rows = data.assigneeIds.map((userId) => ({
        task_id: taskId as string,
        organization_id: data.organizationId,
        user_id: userId,
      }));
      const { error: insertError } = await context.supabase.from("task_assignees").insert(rows);
      if (insertError) throw new Error(insertError.message);
    }

    return { ok: true, id: taskId };
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => taskStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId, "manager");
    const { error } = await context.supabase
      .from("tasks")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("organization_id", data.organizationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId, "manager");
    const { error } = await context.supabase
      .from("tasks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("organization_id", data.organizationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
