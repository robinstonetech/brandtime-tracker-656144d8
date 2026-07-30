import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, createOpaqueKeyFetch } from "./config";

/**
 * Validates the request bearer token and injects an authenticated Supabase
 * client (RLS as the user), plus `userId` and `claims`, into context.
 */
export const requireSupabaseAuth = createMiddleware().server(async ({ next }) => {
  const authHeader = getRequestHeader("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const baseFetch = createOpaqueKeyFetch(SUPABASE_PUBLISHABLE_KEY);

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${token}`);
        return baseFetch(input, { ...init, headers });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return next({
    context: {
      supabase,
      userId: data.user.id,
      claims: data.user,
    },
  });
});
