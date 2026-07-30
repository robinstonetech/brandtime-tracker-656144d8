import { createServerFn } from "@tanstack/react-start";

export interface EnvironmentHealth {
  ok: boolean;
  status: number | null;
  message: string;
}

export interface EnvironmentStatus {
  name: "development" | "production";
  label: string;
  url: string;
  projectRef: string;
  /** Whether this environment has URL + publishable key configured. */
  configured: boolean;
  serviceRoleEnvVar: string;
  serviceRoleConfigured: boolean;
  restHealth: EnvironmentHealth;
  authHealth: EnvironmentHealth;
  serviceRoleHealth: EnvironmentHealth;
  host: string;
}

async function probe(url: string, key: string): Promise<EnvironmentHealth> {
  if (!url || !key) {
    return { ok: false, status: null, message: "Not configured" };
  }
  try {
    const response = await fetch(url, { headers: { apikey: key } });
    return {
      ok: response.status < 500 && response.status !== 401,
      status: response.status,
      message: response.status < 500 && response.status !== 401 ? "Reachable" : response.statusText,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      message: error instanceof Error ? error.message : "Request failed",
    };
  }
}

/**
 * Non-sensitive status of the Supabase project this request resolved to.
 * Returns no keys — only labels, the public API URL, and reachability.
 */
export const getEnvironmentStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<EnvironmentStatus> => {
    const { getServerEnvironment, getServiceRoleKey } = await import(
      "@/integrations/supabase/environment.server"
    );
    const { projectRefFromUrl, isEnvironmentConfigured } = await import(
      "@/integrations/supabase/environments"
    );
    const { getRequestHeader } = await import("@tanstack/react-start/server");

    const environment = getServerEnvironment();
    const serviceRoleKey = getServiceRoleKey(environment);

    const [restHealth, authHealth, serviceRoleHealth] = await Promise.all([
      // Validates the publishable key itself; the REST root rejects non-secret keys.
      probe(`${environment.url}/auth/v1/settings`, environment.publishableKey),
      probe(`${environment.url}/auth/v1/health`, environment.publishableKey),
      probe(`${environment.url}/rest/v1/`, serviceRoleKey),
    ]);

    return {
      name: environment.name,
      label: environment.label,
      url: environment.url,
      projectRef: projectRefFromUrl(environment.url),
      configured: isEnvironmentConfigured(environment.name),
      serviceRoleEnvVar: environment.serviceRoleEnvVar,
      serviceRoleConfigured: serviceRoleKey.length > 0,
      restHealth,
      authHealth,
      serviceRoleHealth,
      host: getRequestHeader("host") ?? "",
    };
  },
);
