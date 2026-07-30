import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type OrgClient = SupabaseClient<Database>;

const ROLE_RANK: Record<AppRole, number> = { member: 1, manager: 2, admin: 3, owner: 4 };

export function roleAtLeast(role: AppRole | null | undefined, minimum: AppRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/**
 * Verifies the caller is an active member of the organization they claim, and
 * (optionally) that they hold at least `minimum` role. Never trust the
 * organization id sent by the client without this check.
 */
export async function requireOrgRole(
  supabase: OrgClient,
  userId: string,
  organizationId: string,
  minimum: AppRole = "member",
): Promise<AppRole> {
  const { data, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("You are not a member of this organization");
  if (!roleAtLeast(data.role, minimum)) {
    throw new Error("You do not have permission to perform this action");
  }
  return data.role;
}
