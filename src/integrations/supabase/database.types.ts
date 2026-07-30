/**
 * Database types for the externally managed Supabase project.
 *
 * Generated from project jwydonacprzffqasxhav. Regenerate with:
 *   supabase gen types typescript --project-id jwydonacprzffqasxhav \
 *     > src/integrations/supabase/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          is_billable: boolean;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_billable?: boolean;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_billable?: boolean;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          contact_email: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_active: boolean;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          contact_email?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          contact_email?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          organization_id: string;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["invitation_status"];
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          organization_id: string;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          organization_id?: string;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          id: string;
          invited_by: string | null;
          is_active: boolean;
          joined_at: string;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          is_active?: boolean;
          joined_at?: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          is_active?: boolean;
          joined_at?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_branding: {
        Row: {
          accent_color: string;
          background_color: string;
          created_at: string;
          favicon_url: string | null;
          font_family: string | null;
          foreground_color: string;
          logo_dark_url: string | null;
          logo_url: string | null;
          organization_id: string;
          primary_color: string;
          product_name: string;
          support_email: string | null;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          background_color?: string;
          created_at?: string;
          favicon_url?: string | null;
          font_family?: string | null;
          foreground_color?: string;
          logo_dark_url?: string | null;
          logo_url?: string | null;
          organization_id: string;
          primary_color?: string;
          product_name?: string;
          support_email?: string | null;
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          background_color?: string;
          created_at?: string;
          favicon_url?: string | null;
          font_family?: string | null;
          foreground_color?: string;
          logo_dark_url?: string | null;
          logo_url?: string | null;
          organization_id?: string;
          primary_color?: string;
          product_name?: string;
          support_email?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string | null;
          default_daily_minutes: number;
          deleted_at: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          timezone: string;
          updated_at: string;
          week_starts_on: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          default_daily_minutes?: number;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          timezone?: string;
          updated_at?: string;
          week_starts_on?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          default_daily_minutes?: number;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          timezone?: string;
          updated_at?: string;
          week_starts_on?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          job_title: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          job_title?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          job_title?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_branding: {
        Row: {
          accent_color: string | null;
          created_at: string;
          logo_url: string | null;
          organization_id: string;
          primary_color: string | null;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          accent_color?: string | null;
          created_at?: string;
          logo_url?: string | null;
          organization_id: string;
          primary_color?: string | null;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          accent_color?: string | null;
          created_at?: string;
          logo_url?: string | null;
          organization_id?: string;
          primary_color?: string | null;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_branding_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_branding_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          created_at: string;
          hourly_rate: number | null;
          id: string;
          organization_id: string;
          project_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          hourly_rate?: number | null;
          id?: string;
          organization_id: string;
          project_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          hourly_rate?: number | null;
          id?: string;
          organization_id?: string;
          project_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          budget_minutes: number | null;
          client_id: string | null;
          code: string | null;
          created_at: string;
          created_by: string | null;
          default_hourly_rate: number | null;
          deleted_at: string | null;
          description: string | null;
          ends_on: string | null;
          id: string;
          is_billable: boolean;
          name: string;
          organization_id: string;
          starts_on: string | null;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
        };
        Insert: {
          budget_minutes?: number | null;
          client_id?: string | null;
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          default_hourly_rate?: number | null;
          deleted_at?: string | null;
          description?: string | null;
          ends_on?: string | null;
          id?: string;
          is_billable?: boolean;
          name: string;
          organization_id: string;
          starts_on?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
        };
        Update: {
          budget_minutes?: number | null;
          client_id?: string | null;
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          default_hourly_rate?: number | null;
          deleted_at?: string | null;
          description?: string | null;
          ends_on?: string | null;
          id?: string;
          is_billable?: boolean;
          name?: string;
          organization_id?: string;
          starts_on?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      running_timers: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string | null;
          organization_id: string;
          project_id: string | null;
          started_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          organization_id: string;
          project_id?: string | null;
          started_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          organization_id?: string;
          project_id?: string | null;
          started_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "running_timers_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "running_timers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "running_timers_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      time_entries: {
        Row: {
          category_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          duration_minutes: number;
          ended_at: string | null;
          entry_date: string;
          hourly_rate: number | null;
          id: string;
          is_billable: boolean;
          organization_id: string;
          project_id: string | null;
          source: string;
          started_at: string | null;
          timesheet_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          duration_minutes: number;
          ended_at?: string | null;
          entry_date: string;
          hourly_rate?: number | null;
          id?: string;
          is_billable?: boolean;
          organization_id: string;
          project_id?: string | null;
          source?: string;
          started_at?: string | null;
          timesheet_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          duration_minutes?: number;
          ended_at?: string | null;
          entry_date?: string;
          hourly_rate?: number | null;
          id?: string;
          is_billable?: boolean;
          organization_id?: string;
          project_id?: string | null;
          source?: string;
          started_at?: string | null;
          timesheet_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_timesheet_id_fkey";
            columns: ["timesheet_id"];
            isOneToOne: false;
            referencedRelation: "timesheets";
            referencedColumns: ["id"];
          },
        ];
      };
      timesheets: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          period_end: string;
          period_start: string;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["timesheet_status"];
          submitted_at: string | null;
          total_minutes: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          period_end: string;
          period_start: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["timesheet_status"];
          submitted_at?: string | null;
          total_minutes?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          period_end?: string;
          period_start?: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["timesheet_status"];
          submitted_at?: string | null;
          total_minutes?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timesheets_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: { Args: { _token_hash: string }; Returns: string };
      has_min_role: {
        Args: {
          _org_id: string;
          _role: Database["public"]["Enums"]["app_role"];
          _user_id?: string;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _org_id: string;
          _role: Database["public"]["Enums"]["app_role"];
          _user_id?: string;
        };
        Returns: boolean;
      };
      is_org_member: {
        Args: { _org_id: string; _user_id?: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "owner" | "admin" | "manager" | "member";
      invitation_status: "pending" | "accepted" | "revoked" | "expired";
      project_status: "active" | "on_hold" | "archived";
      timesheet_status: "draft" | "submitted" | "approved" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["owner", "admin", "manager", "member"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      project_status: ["active", "on_hold", "archived"],
      timesheet_status: ["draft", "submitted", "approved", "rejected"],
    },
  },
} as const;
