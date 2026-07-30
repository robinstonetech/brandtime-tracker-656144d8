/**
 * Placeholder database types for the externally managed Supabase project.
 *
 * Regenerate after each applied migration with:
 *   supabase gen types typescript --project-id jwydonacprzffqasxhav > src/integrations/supabase/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
