import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WorkspaceBranding = {
  productName: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  fontFamily: string | null;
  supportEmail: string | null;
};

export type WorkspaceMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: "owner" | "admin" | "manager" | "member";
  branding: WorkspaceBranding | null;
};

export type Workspace = {
  profile: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    jobTitle: string | null;
    timezone: string;
  } | null;
  memberships: WorkspaceMembership[];
};

const DEFAULT_BRANDING: WorkspaceBranding = {
  productName: "Robinstone Business Suite - Time",
  primaryColor: "#1f3a5f",
  accentColor: "#c9a227",
  backgroundColor: "#ffffff",
  foregroundColor: "#101828",
  logoUrl: null,
  logoDarkUrl: null,
  fontFamily: null,
  supportEmail: null,
};

/** Everything the app shell needs about the signed-in user. */
export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Workspace> => {
    const [profileResult, membershipResult] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, job_title, timezone")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("memberships")
        .select(
          "organization_id, role, organizations!inner(id, name, slug, is_active, deleted_at), organization_branding:organization_id(product_name, primary_color, accent_color, background_color, foreground_color, logo_url, logo_dark_url, font_family, support_email)",
        )
        .eq("user_id", context.userId)
        .eq("is_active", true),
    ]);

    if (profileResult.error) throw new Error(profileResult.error.message);
    if (membershipResult.error) throw new Error(membershipResult.error.message);

    const memberships: WorkspaceMembership[] = (membershipResult.data ?? [])
      .filter((row) => {
        const org = row.organizations as unknown as { is_active: boolean; deleted_at: string | null };
        return org && org.is_active && !org.deleted_at;
      })
      .map((row) => {
        const org = row.organizations as unknown as { name: string; slug: string };
        const brandingRow = (
          Array.isArray(row.organization_branding)
            ? row.organization_branding[0]
            : row.organization_branding
        ) as Record<string, string | null> | null | undefined;

        return {
          organizationId: row.organization_id,
          organizationName: org.name,
          organizationSlug: org.slug,
          role: row.role,
          branding: brandingRow
            ? {
                productName: brandingRow.product_name ?? DEFAULT_BRANDING.productName,
                primaryColor: brandingRow.primary_color ?? DEFAULT_BRANDING.primaryColor,
                accentColor: brandingRow.accent_color ?? DEFAULT_BRANDING.accentColor,
                backgroundColor: brandingRow.background_color ?? DEFAULT_BRANDING.backgroundColor,
                foregroundColor: brandingRow.foreground_color ?? DEFAULT_BRANDING.foregroundColor,
                logoUrl: brandingRow.logo_url ?? null,
                logoDarkUrl: brandingRow.logo_dark_url ?? null,
                fontFamily: brandingRow.font_family ?? null,
                supportEmail: brandingRow.support_email ?? null,
              }
            : null,
        };
      })
      .sort((a, b) => a.organizationName.localeCompare(b.organizationName));

    return {
      profile: profileResult.data
        ? {
            id: profileResult.data.id,
            email: profileResult.data.email,
            fullName: profileResult.data.full_name,
            avatarUrl: profileResult.data.avatar_url,
            jobTitle: profileResult.data.job_title,
            timezone: profileResult.data.timezone,
          }
        : null,
      memberships,
    };
  });

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Self-serve organization creation: org + branding + owner membership. */
export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createOrganizationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = getSupabaseAdmin(context.environment);

    const base = slugify(data.name) || "org";
    let slug = base;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: existing } = await admin
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: data.name,
        slug,
        timezone: data.timezone,
        created_by: context.userId,
      })
      .select("id, name, slug")
      .single();

    if (orgError || !org) throw new Error(orgError?.message ?? "Could not create organization");

    const { error: brandingError } = await admin
      .from("organization_branding")
      .upsert({ organization_id: org.id, product_name: data.name }, { onConflict: "organization_id" });
    if (brandingError) throw new Error(brandingError.message);

    const { error: membershipError } = await admin.from("memberships").insert({
      organization_id: org.id,
      user_id: context.userId,
      role: "owner",
    });
    if (membershipError) throw new Error(membershipError.message);

    return { organizationId: org.id, slug: org.slug };
  });
