/**
 * Supabase environment registry.
 *
 * Client-safe: contains only publishable values. The service-role key for each
 * environment is read server-side from the named environment variable.
 */

export type SupabaseEnvironmentName = "development" | "production";

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
  production: {
    name: "production",
    label: "Production",
    // Fill these in when the production Supabase project is ready.
    // Until then the resolver falls back to development and flags it.
    url: "",
    publishableKey: "",
    serviceRoleEnvVar: "PROD_SUPABASE_SERVICE_ROLE_KEY",
  },
};

/** Hosts that must always resolve to the production project. */
export const PRODUCTION_HOSTS = ["mytimesheets.app", "www.mytimesheets.app"];

/** localStorage key used for the development-only environment override. */
export const ENV_OVERRIDE_STORAGE_KEY = "rbs.supabase-env-override";

export function isEnvironmentName(value: unknown): value is SupabaseEnvironmentName {
  return value === "development" || value === "production";
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

/**
 * Resolve the target environment.
 *
 * 1. Explicit setting (VITE_SUPABASE_ENV / SUPABASE_ENV) wins.
 * 2. Otherwise the hostname decides: production hosts -> production,
 *    everything else (previews, localhost) -> development.
 * 3. A stored override is honoured ONLY when the base resolution is
 *    development, so production can never be pointed at another project.
 * 4. If the resolved environment isn't configured yet, fall back to development.
 */
export function resolveEnvironmentName(options: {
  host?: string | null;
  explicit?: string | null;
  override?: string | null;
}): SupabaseEnvironmentName {
  const explicit = options.explicit?.trim();
  const host = normaliseHost(options.host);

  let base: SupabaseEnvironmentName;
  if (isEnvironmentName(explicit)) {
    base = explicit;
  } else if (PRODUCTION_HOSTS.includes(host)) {
    base = "production";
  } else {
    base = "development";
  }

  let resolved = base;
  if (base === "development" && isEnvironmentName(options.override)) {
    resolved = options.override;
  }

  if (!isEnvironmentConfigured(resolved)) {
    return "development";
  }
  return resolved;
}

export function getEnvironment(name: SupabaseEnvironmentName): SupabaseEnvironment {
  return SUPABASE_ENVIRONMENTS[name];
}
