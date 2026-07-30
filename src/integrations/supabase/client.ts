import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { createOpaqueKeyFetch, getBrowserEnvironment } from "./config";

const environment = getBrowserEnvironment();

/** Browser Supabase client. RLS applies as the signed-in user. */
export const supabase = createClient<Database>(
  environment.url,
  environment.publishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Namespaced per environment so dev and prod sessions never collide.
      storageKey: `sb-${environment.name}-auth-token`,
      storage: typeof window === "undefined" ? undefined : window.localStorage,
    },
    global: { fetch: createOpaqueKeyFetch(environment.publishableKey) },
  },
);

/** Environment this browser client is connected to. */
export const activeBrowserEnvironment = environment;
