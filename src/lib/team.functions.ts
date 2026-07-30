import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateInvitationToken, hashInvitationToken, invitationUrl } from "@/lib/invitation-token";
import { requireOrgRole } from "@/lib/org-access";
import {
  acceptInviteSchema,
  idSchema,
  inviteSchema,
  memberActiveSchema,
  memberRoleSchema,
  orgSchema,
} from "@/lib/schemas";

export type TeamMember = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  role: "owner" | "admin" | "manager" | "member";
  isActive: boolean;
  joinedAt: string;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: "owner" | "admin" | "manager" | "member";
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
};

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgSchema.parse(data))
  .handler(async ({ data, context }) => {
    const role = await requireOrgRole(context.supabase, context.userId, data.organizationId);

    const [membersResult, invitesResult] = await Promise.all([
      context.supabase
        .from("memberships")
        .select(
          "user_id, role, is_active, created_at, profiles:user_id(full_name, email, avatar_url, job_title)",
        )
        .eq("organization_id", data.organizationId)
        .order("created_at"),
      context.supabase
        .from("invitations")
        .select("id, email, role, status, expires_at, created_at")
        .eq("organization_id", data.organizationId)
        .order("created_at", { ascending: false }),
    ]);

    if (membersResult.error) throw new Error(membersResult.error.message);

    const members: TeamMember[] = (membersResult.data ?? []).map((row) => {
      const profile = row.profiles as unknown as {
        full_name: string | null;
        email: string;
        avatar_url: string | null;
        job_title: string | null;
      } | null;
      return {
        userId: row.user_id,
        name: profile?.full_name ?? profile?.email ?? "Unknown",
        email: profile?.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        jobTitle: profile?.job_title ?? null,
        role: row.role,
        isActive: row.is_active,
        joinedAt: row.created_at,
      };
    });

    return {
      role,
      canManage: role === "owner" || role === "admin",
      currentUserId: context.userId,
      members,
      invitations: (invitesResult.data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      })) as TeamInvitation[],
    };
  });

export const inviteTeammate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const actorRole = await requireOrgRole(
      context.supabase,
      context.userId,
      data.organizationId,
      "admin",
    );
    if (data.role === "owner" && actorRole !== "owner") {
      throw new Error("Only an owner can invite another owner");
    }

    const token = generateInvitationToken();
    const tokenHash = await hashInvitationToken(token);

    const { error } = await context.supabase.from("invitations").insert({
      organization_id: data.organizationId,
      email: data.email,
      role: data.role,
      token_hash: tokenHash,
      invited_by: context.userId,
    });
    if (error) {
      throw new Error(
        error.code === "23505"
          ? "There is already a pending invitation for that email"
          : error.message,
      );
    }

    const [{ data: org }, { data: profile }] = await Promise.all([
      context.supabase
        .from("organizations")
        .select("name")
        .eq("id", data.organizationId)
        .maybeSingle(),
      context.supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);

    const origin =
      getRequestHeader("origin") ??
      (getRequestHeader("host") ? `https://${getRequestHeader("host")}` : "https://mytimesheets.app");
    const url = invitationUrl(origin, token);

    const { invitationEmail, sendEmail } = await import("@/lib/mailer.server");
    const message = invitationEmail(
      org?.name ?? "your organization",
      profile?.full_name ?? profile?.email ?? "A teammate",
      url,
    );
    const result = await sendEmail({ to: data.email, ...message });

    return { inviteUrl: url, delivered: result.delivered };
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: invite, error: readError } = await context.supabase
      .from("invitations")
      .select("organization_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!invite) throw new Error("Invitation not found");

    await requireOrgRole(context.supabase, context.userId, invite.organization_id, "admin");
    if (invite.status !== "pending") throw new Error("Only pending invitations can be revoked");

    const { error } = await context.supabase
      .from("invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberRoleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const actorRole = await requireOrgRole(
      context.supabase,
      context.userId,
      data.organizationId,
      "admin",
    );
    if (data.userId === context.userId) throw new Error("You cannot change your own role");
    if ((data.role === "owner" || actorRole !== "owner") && actorRole !== "owner") {
      if (data.role === "owner") throw new Error("Only an owner can grant the owner role");
    }

    const { data: target, error: targetError } = await context.supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (targetError) throw new Error(targetError.message);
    if (!target) throw new Error("That person is not a member of this organization");
    if (target.role === "owner" && actorRole !== "owner") {
      throw new Error("Only an owner can change another owner's role");
    }

    const { error } = await context.supabase
      .from("memberships")
      .update({ role: data.role })
      .eq("organization_id", data.organizationId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberActiveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const actorRole = await requireOrgRole(
      context.supabase,
      context.userId,
      data.organizationId,
      "admin",
    );
    if (data.userId === context.userId) throw new Error("You cannot deactivate yourself");

    const { data: target } = await context.supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (target?.role === "owner" && actorRole !== "owner") {
      throw new Error("Only an owner can deactivate another owner");
    }

    const { error } = await context.supabase
      .from("memberships")
      .update({ is_active: data.isActive })
      .eq("organization_id", data.organizationId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Accepts an invitation for the signed-in user via the security-definer RPC. */
export const acceptInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => acceptInviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const tokenHash = await hashInvitationToken(data.token);
    const { data: organizationId, error } = await context.supabase.rpc("accept_invitation", {
      _token_hash: tokenHash,
    });
    if (error) throw new Error(error.message);
    return { organizationId: organizationId as string };
  });
