import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";
import { SUPABASE_URL, createOpaqueKeyFetch } from "./config";

/**
 * Service-role client. BYPASSES RLS — server-only, privileged operations only.
 * Import inside a server-function `.handler()` via `await import(...)`.
 */
const serviceRoleKey = process.env.EXT_SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: createOpaqueKeyFetch(serviceRoleKey) },
});
