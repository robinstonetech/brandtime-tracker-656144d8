import { getEnvironment, resolveEnvironmentName, type SupabaseEnvironment } from "./environments";

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

export function getBrowserEnvironment(): SupabaseEnvironment {
  return getEnvironment(resolveEnvironmentName());
}
