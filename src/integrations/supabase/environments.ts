/**
 * Supabase environment registry.
 *
 * Client-safe: contains only publishable values. The service-role key is read
 * server-side from the named environment variable.
 *
 * There is a single environment — development. Every host connects to it.
 */

export type SupabaseEnvironmentName = "development";

export interface SupabaseEnvironment {
  name: SupabaseEnvironmentName;
  label: string;
  /** Supabase API URL, e.g. https://<ref>.supabase.co */
  url: string;
  /** Publishable / anon key — safe to ship to the browser. */
  publishableKey: string;
  /** Name of the server-side env var holding this project's service-role key. */
  serviceRoleEnvVar: string;
}

export const SUPABASE_ENVIRONMENTS: Record<SupabaseEnvironmentName, SupabaseEnvironment> = {
  development: {
    name: "development",
    label: "Development",
    url: "https://jwydonacprzffqasxhav.supabase.co",
    publishableKey: "sb_publishable_GCesRR4-iPCvx8XblkjYdQ_oTfmFwsv",
    serviceRoleEnvVar: "EXT_SUPABASE_SERVICE_ROLE_KEY",
  },
};

export function isEnvironmentName(value: unknown): value is SupabaseEnvironmentName {
  return value === "development";
}

export function isEnvironmentConfigured(name: SupabaseEnvironmentName): boolean {
  const env = SUPABASE_ENVIRONMENTS[name];
  return Boolean(env.url && env.publishableKey);
}

/** Extract the project ref from a Supabase API URL. */
export function projectRefFromUrl(url: string): string {
  const match = /^https:\/\/([a-z0-9-]+)\.supabase\./i.exec(url);
  return match?.[1] ?? "";
}

/** Strip port and normalise a host header / location host. */
export function normaliseHost(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(":")[0]!.trim();
}

/** Always the development project, regardless of host or overrides. */
export function resolveEnvironmentName(): SupabaseEnvironmentName {
  return "development";
}

export function getEnvironment(name: SupabaseEnvironmentName): SupabaseEnvironment {
  return SUPABASE_ENVIRONMENTS[name];
}
