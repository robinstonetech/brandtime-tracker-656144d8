import {
  ENV_OVERRIDE_STORAGE_KEY,
  getEnvironment,
  resolveEnvironmentName,
  type SupabaseEnvironment,
  type SupabaseEnvironmentName,
} from "./environments";

/**
 * New-format `sb_publishable_*` / `sb_secret_*` keys are opaque, not JWTs.
 * PostgREST rejects them when sent as `Authorization: Bearer <key>`, so we
 * strip that header and send only `apikey`.
 */
export function createOpaqueKeyFetch(key: string): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function readOverride(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ENV_OVERRIDE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Environment the browser should talk to, resolved from host + override. */
export function resolveBrowserEnvironmentName(): SupabaseEnvironmentName {
  return resolveEnvironmentName({
    host: typeof window === "undefined" ? null : window.location.host,
    explicit: import.meta.env.VITE_SUPABASE_ENV ?? null,
    override: readOverride(),
  });
}

export function getBrowserEnvironment(): SupabaseEnvironment {
  return getEnvironment(resolveBrowserEnvironmentName());
}

/** Persist a development-only override. Ignored when running in production. */
export function setEnvironmentOverride(name: SupabaseEnvironmentName | null) {
  if (typeof window === "undefined") return;
  try {
    if (name) {
      window.localStorage.setItem(ENV_OVERRIDE_STORAGE_KEY, name);
    } else {
      window.localStorage.removeItem(ENV_OVERRIDE_STORAGE_KEY);
    }
  } catch {
    /* storage unavailable — ignore */
  }
}
