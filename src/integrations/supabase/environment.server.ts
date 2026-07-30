import { getRequestHeader } from "@tanstack/react-start/server";

import {
  getEnvironment,
  resolveEnvironmentName,
  type SupabaseEnvironment,
  type SupabaseEnvironmentName,
} from "./environments";

/**
 * Resolve the environment for the current server request.
 *
 * Host-driven, so a request to myTimesheets.app always uses the production
 * project and a preview request always uses development — the server can never
 * disagree with the browser.
 */
export function resolveServerEnvironmentName(): SupabaseEnvironmentName {
  let host: string | null = null;
  try {
    host = getRequestHeader("host") ?? null;
  } catch {
    host = null;
  }

  return resolveEnvironmentName({
    host,
    explicit: process.env.SUPABASE_ENV ?? null,
    override: null,
  });
}

export function getServerEnvironment(): SupabaseEnvironment {
  return getEnvironment(resolveServerEnvironmentName());
}

/** Service-role key for the given environment, or an empty string when unset. */
export function getServiceRoleKey(environment: SupabaseEnvironment): string {
  return process.env[environment.serviceRoleEnvVar] ?? "";
}
