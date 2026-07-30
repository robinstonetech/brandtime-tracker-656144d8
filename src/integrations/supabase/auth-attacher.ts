import { createMiddleware } from "@tanstack/react-start";

/** Attaches the current Supabase access token to every server-function call. */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next();

    const { supabase } = await import("./client");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return next();

    return next({
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  },
);
