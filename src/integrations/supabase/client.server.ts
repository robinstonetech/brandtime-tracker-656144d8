import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { createOpaqueKeyFetch } from "./config";
import { getServerEnvironment, getServiceRoleKey } from "./environment.server";
import type { SupabaseEnvironment } from "./environments";

/**
 * Service-role client for the environment of the current request.
 * BYPASSES RLS — server-only, privileged operations only.
 * Import inside a server-function `.handler()` via `await import(...)`.
 */
export function getSupabaseAdmin(
  environment: SupabaseEnvironment = getServerEnvironment(),
): SupabaseClient<Database> {
  const key = getServiceRoleKey(environment);

  return createClient<Database>(environment.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createOpaqueKeyFetch(key) },
  });
}

/** Publishable-key client for public reads during SSR (RLS applies as anon). */
export function getSupabasePublicServer(
  environment: SupabaseEnvironment = getServerEnvironment(),
): SupabaseClient<Database> {
  return createClient<Database>(environment.url, environment.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: createOpaqueKeyFetch(environment.publishableKey) },
  });
}
