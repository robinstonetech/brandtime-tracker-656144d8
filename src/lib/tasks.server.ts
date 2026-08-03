import type { OrgClient } from "@/lib/org-access";

export type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_on: string | null;
  project_id: string;
  category_id: string;
};

/** Loads org tasks plus lookup maps for assignees, project names and category names. */
export async function loadTasks(supabase: OrgClient, organizationId: string) {
  const [tasksResult, assigneesResult, projectsResult, categoriesResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, status, due_on, project_id, category_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase.from("task_assignees").select("task_id, user_id").eq("organization_id", organizationId),
    supabase
      .from("projects")
      .select("id, name, code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    supabase.from("categories").select("id, name").eq("organization_id", organizationId),
  ]);

  if (tasksResult.error) throw new Error(tasksResult.error.message);
  if (assigneesResult.error) throw new Error(assigneesResult.error.message);
  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);

  const assigneesByTask = new Map<string, string[]>();
  for (const row of assigneesResult.data ?? []) {
    const list = assigneesByTask.get(row.task_id) ?? [];
    list.push(row.user_id);
    assigneesByTask.set(row.task_id, list);
  }

  const projectNames = new Map<string, string>();
  for (const row of projectsResult.data ?? []) {
    projectNames.set(row.id, row.code ? `${row.code} — ${row.name}` : row.name);
  }
  const categoryNames = new Map<string, string>();
  for (const row of categoriesResult.data ?? []) categoryNames.set(row.id, row.name);

  return {
    tasks: (tasksResult.data ?? []) as TaskRecord[],
    assigneesByTask,
    projectNames,
    categoryNames,
  };
}
