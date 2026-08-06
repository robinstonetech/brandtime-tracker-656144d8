import {
  getEnvironment,
  resolveEnvironmentName,
  type SupabaseEnvironment,
  type SupabaseEnvironmentName,
} from "./environments";

/** The app has one database — development — for every host. */
export function resolveServerEnvironmentName(): SupabaseEnvironmentName {
  return resolveEnvironmentName();
}

export function getServerEnvironment(): SupabaseEnvironment {
  return getEnvironment(resolveServerEnvironmentName());
}

/** Service-role key for the given environment, or an empty string when unset. */
export function getServiceRoleKey(environment: SupabaseEnvironment): string {
  return process.env[environment.serviceRoleEnvVar] ?? "";
}
