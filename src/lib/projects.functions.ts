import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireOrgRole } from "@/lib/org-access";
import {
  categorySchema,
  clientSchema,
  orgIdActiveSchema,
  orgIdArchivedSchema,
  orgSchema,
  projectSchema,
} from "@/lib/schemas";

export type ProjectRow = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: "active" | "on_hold" | "archived";
  isBillable: boolean;
  defaultHourlyRate: number | null;
  clientId: string | null;
  clientName: string | null;
  startsOn: string | null;
  endsOn: string | null;
  memberIds: string[];
};

export type ClientRow = {
  id: string;
  name: string;
  contactEmail: string | null;
  isActive: boolean;
  projectCount: number;
  projects: { id: string; name: string }[];
};

export type CategoryRow = {
  id: string;
  name: string;
  isBillable: boolean;
  isActive: boolean;
  projectId: string | null;
  projectName: string | null;
};

export type OrgPerson = { userId: string; name: string; email: string; role: string };

export const getProjectsPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgSchema.parse(data))
  .handler(async ({ data, context }) => {
    const role = await requireOrgRole(context.supabase, context.userId, data.organizationId);

    const [projectsResult, clientsResult, categoriesResult, membersResult, peopleResult] =
      await Promise.all([
        context.supabase
          .from("projects")
          .select(
            "id, name, code, description, status, is_billable, default_hourly_rate, client_id, starts_on, ends_on, clients(name)",
          )
          .eq("organization_id", data.organizationId)
          .is("deleted_at", null)
          .order("name"),
        context.supabase
          .from("clients")
          .select("id, name, contact_email, is_active")
          .eq("organization_id", data.organizationId)
          .is("deleted_at", null)
          .order("name"),
        context.supabase
          .from("categories")
          .select("id, name, is_billable, is_active")
          .eq("organization_id", data.organizationId)
          .order("name"),
        context.supabase
          .from("project_members")
          .select("project_id, user_id")
          .eq("organization_id", data.organizationId),
        context.supabase
          .from("memberships")
          .select("user_id, role")
          .eq("organization_id", data.organizationId)
          .eq("is_active", true),
      ]);

    if (projectsResult.error) throw new Error(projectsResult.error.message);
    if (clientsResult.error) throw new Error(clientsResult.error.message);
    if (categoriesResult.error) throw new Error(categoriesResult.error.message);
    if (membersResult.error) throw new Error(membersResult.error.message);

    const membersByProject = new Map<string, string[]>();
    for (const row of membersResult.data ?? []) {
      const list = membersByProject.get(row.project_id) ?? [];
      list.push(row.user_id);
      membersByProject.set(row.project_id, list);
    }

    const projectCountByClient = new Map<string, number>();
    for (const row of projectsResult.data ?? []) {
      if (!row.client_id) continue;
      projectCountByClient.set(row.client_id, (projectCountByClient.get(row.client_id) ?? 0) + 1);
    }

    const peopleRows = peopleResult.data ?? [];
    const peopleProfiles = new Map<string, { full_name: string | null; email: string }>();
    const peopleIds = [...new Set(peopleRows.map((row) => row.user_id))];
    if (peopleIds.length > 0) {
      const { data: profiles, error: profileError } = await context.supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", peopleIds);
      if (profileError) throw new Error(profileError.message);
      for (const profile of profiles ?? []) {
        peopleProfiles.set(profile.id, { full_name: profile.full_name, email: profile.email });
      }
    }

    const people: OrgPerson[] = peopleRows.map((row) => {
      const profile = peopleProfiles.get(row.user_id) ?? null;
      return {
        userId: row.user_id,
        name: profile?.full_name ?? profile?.email ?? "Unknown",
        email: profile?.email ?? "",
        role: row.role,
      };
    });


    return {
      role,
      canManage: role === "owner" || role === "admin" || role === "manager",
      projects: (projectsResult.data ?? []).map((row) => {
        const client = row.clients as unknown as { name: string } | null;
        return {
          id: row.id,
          name: row.name,
          code: row.code,
          description: row.description,
          status: row.status,
          isBillable: row.is_billable,
          defaultHourlyRate: row.default_hourly_rate,
          clientId: row.client_id,
          clientName: client?.name ?? null,
          startsOn: row.starts_on,
          endsOn: row.ends_on,
          memberIds: membersByProject.get(row.id) ?? [],
        } satisfies ProjectRow;
      }),
      clients: (clientsResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        contactEmail: row.contact_email,
        isActive: row.is_active,
        projectCount: projectsByClient.get(row.id)?.length ?? 0,
        projects: projectsByClient.get(row.id) ?? [],
      })) satisfies ClientRow[],
      categories: (categoriesResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        isBillable: row.is_billable,
        isActive: row.is_active,
        projectId: row.project_id,
        projectName: row.project_id ? (projectNames.get(row.project_id) ?? null) : null,
      })) satisfies CategoryRow[],
      people,
    };
  });

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => projectSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId, "manager");

    const payload = {
      organization_id: data.organizationId,
      name: data.name,
      code: data.code || null,
      description: data.description || null,
      client_id: data.clientId || null,
      status: data.status,
      is_billable: data.isBillable,
      default_hourly_rate: data.defaultHourlyRate ?? null,
      starts_on: data.startsOn || null,
      ends_on: data.endsOn || null,
    };

    let projectId = data.id ?? null;

    if (projectId) {
      const { error } = await context.supabase
        .from("projects")
        .update(payload)
        .eq("id", projectId)
        .eq("organization_id", data.organizationId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await context.supabase
        .from("projects")
        .insert({ ...payload, created_by: context.userId })
        .select("id")
        .single();
      if (error || !created) throw new Error(error?.message ?? "Could not create project");
      projectId = created.id;
    }

    const { error: clearError } = await context.supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId);
    if (clearError) throw new Error(clearError.message);

    if (data.memberIds.length > 0) {
      const { error: memberError } = await context.supabase.from("project_members").insert(
        data.memberIds.map((userId) => ({
          organization_id: data.organizationId,
          project_id: projectId!,
          user_id: userId,
        })),
      );
      if (memberError) throw new Error(memberError.message);
    }

    return { projectId };
  });

export const archiveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    orgIdArchivedSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId, "manager");
    const { error } = await context.supabase
      .from("projects")
      .update({ status: data.archived ? "archived" : "active" })
      .eq("id", data.id)
      .eq("organization_id", data.organizationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => clientSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId, "manager");
    const payload = {
      organization_id: data.organizationId,
      name: data.name,
      contact_email: data.contactEmail ? data.contactEmail : null,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("clients")
        .update(payload)
        .eq("id", data.id)
        .eq("organization_id", data.organizationId);
      if (error) throw new Error(error.message);
      return { clientId: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("clients")
      .insert(payload)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create client");
    return { clientId: created.id };
  });

export const setClientActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    orgIdActiveSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId, "manager");
    const { error } = await context.supabase
      .from("clients")
      .update({ is_active: data.isActive })
      .eq("id", data.id)
      .eq("organization_id", data.organizationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => categorySchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId, "manager");
    const payload = {
      organization_id: data.organizationId,
      name: data.name,
      is_billable: data.isBillable,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("categories")
        .update(payload)
        .eq("id", data.id)
        .eq("organization_id", data.organizationId);
      if (error) throw new Error(error.message);
      return { categoryId: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("categories")
      .insert(payload)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create category");
    return { categoryId: created.id };
  });

export const setCategoryActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    orgIdActiveSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireOrgRole(context.supabase, context.userId, data.organizationId, "manager");
    const { error } = await context.supabase
      .from("categories")
      .update({ is_active: data.isActive })
      .eq("id", data.id)
      .eq("organization_id", data.organizationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
