/**
 * Database types for the externally managed Supabase project.
 *
 * NOTE: hand-derived from supabase/migrations/*.sql. Replace with the
 * authoritative generated file when convenient:
 *   supabase gen types typescript --project-id jwydonacprzffqasxhav \
 *     > src/integrations/supabase/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          week_starts_on: number;
          timezone: string;
          default_daily_minutes: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          week_starts_on?: number;
          timezone?: string;
          default_daily_minutes?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          week_starts_on?: number;
          timezone?: string;
          default_daily_minutes?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      organization_branding: {
        Row: {
          organization_id: string;
          logo_url: string | null;
          logo_dark_url: string | null;
          favicon_url: string | null;
          primary_color: string;
          accent_color: string;
          background_color: string;
          foreground_color: string;
          font_family: string | null;
          product_name: string;
          support_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          logo_url?: string | null;
          logo_dark_url?: string | null;
          favicon_url?: string | null;
          primary_color?: string;
          accent_color?: string;
          background_color?: string;
          foreground_color?: string;
          font_family?: string | null;
          product_name?: string;
          support_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          logo_url?: string | null;
          logo_dark_url?: string | null;
          favicon_url?: string | null;
          primary_color?: string;
          accent_color?: string;
          background_color?: string;
          foreground_color?: string;
          font_family?: string | null;
          product_name?: string;
          support_email?: string | null;
          created_at?: string;
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
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          job_title: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          job_title?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          job_title?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          is_active: boolean;
          invited_by: string | null;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["app_role"];
          is_active?: boolean;
          invited_by?: string | null;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          is_active?: boolean;
          invited_by?: string | null;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
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
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["invitation_status"];
          token_hash: string;
          invited_by: string | null;
          accepted_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
          token_hash: string;
          invited_by?: string | null;
          accepted_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
          token_hash?: string;
          invited_by?: string | null;
          accepted_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
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
      clients: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          contact_email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          contact_email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          contact_email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
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
      projects: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string | null;
          name: string;
          code: string | null;
          description: string | null;
          status: Database["public"]["Enums"]["project_status"];
          is_billable: boolean;
          default_hourly_rate: number | null;
          budget_minutes: number | null;
          starts_on: string | null;
          ends_on: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id?: string | null;
          name: string;
          code?: string | null;
          description?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          is_billable?: boolean;
          default_hourly_rate?: number | null;
          budget_minutes?: number | null;
          starts_on?: string | null;
          ends_on?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          client_id?: string | null;
          name?: string;
          code?: string | null;
          description?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          is_billable?: boolean;
          default_hourly_rate?: number | null;
          budget_minutes?: number | null;
          starts_on?: string | null;
          ends_on?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
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
      project_branding: {
        Row: {
          project_id: string;
          organization_id: string;
          logo_url: string | null;
          primary_color: string | null;
          accent_color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id: string;
          organization_id: string;
          logo_url?: string | null;
          primary_color?: string | null;
          accent_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string;
          organization_id?: string;
          logo_url?: string | null;
          primary_color?: string | null;
          accent_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
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
          id: string;
          project_id: string;
          organization_id: string;
          user_id: string;
          hourly_rate: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          organization_id: string;
          user_id: string;
          hourly_rate?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          organization_id?: string;
          user_id?: string;
          hourly_rate?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          color: string | null;
          is_billable: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          color?: string | null;
          is_billable?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          color?: string | null;
          is_billable?: boolean;
          is_active?: boolean;
          created_at?: string;
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
      timesheets: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          status: Database["public"]["Enums"]["timesheet_status"];
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          review_note: string | null;
          total_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          status?: Database["public"]["Enums"]["timesheet_status"];
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_note?: string | null;
          total_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          period_start?: string;
          period_end?: string;
          status?: Database["public"]["Enums"]["timesheet_status"];
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_note?: string | null;
          total_minutes?: number;
          created_at?: string;
          updated_at?: string;
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
      time_entries: {
        Row: {
          id: string;
          organization_id: string;
          timesheet_id: string | null;
          user_id: string;
          project_id: string | null;
          category_id: string | null;
          entry_date: string;
          duration_minutes: number;
          started_at: string | null;
          ended_at: string | null;
          description: string | null;
          is_billable: boolean;
          hourly_rate: number | null;
          source: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          timesheet_id?: string | null;
          user_id: string;
          project_id?: string | null;
          category_id?: string | null;
          entry_date: string;
          duration_minutes: number;
          started_at?: string | null;
          ended_at?: string | null;
          description?: string | null;
          is_billable?: boolean;
          hourly_rate?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          timesheet_id?: string | null;
          user_id?: string;
          project_id?: string | null;
          category_id?: string | null;
          entry_date?: string;
          duration_minutes?: number;
          started_at?: string | null;
          ended_at?: string | null;
          description?: string | null;
          is_billable?: boolean;
          hourly_rate?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_timesheet_id_fkey";
            columns: ["timesheet_id"];
            isOneToOne: false;
            referencedRelation: "timesheets";
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
            foreignKeyName: "time_entries_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      running_timers: {
        Row: {
          user_id: string;
          organization_id: string;
          project_id: string | null;
          category_id: string | null;
          description: string | null;
          started_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          organization_id: string;
          project_id?: string | null;
          category_id?: string | null;
          description?: string | null;
          started_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          organization_id?: string;
          project_id?: string | null;
          category_id?: string | null;
          description?: string | null;
          started_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "running_timers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_invitation: {
        Args: { _token_hash: string };
        Returns: string;
      };
      is_org_member: {
        Args: { _org_id: string; _user_id?: string };
        Returns: boolean;
      };
      has_role: {
        Args: { _org_id: string; _role: Database["public"]["Enums"]["app_role"]; _user_id?: string };
        Returns: boolean;
      };
      has_min_role: {
        Args: { _org_id: string; _role: Database["public"]["Enums"]["app_role"]; _user_id?: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "owner" | "admin" | "manager" | "member";
      invitation_status: "pending" | "accepted" | "revoked" | "expired";
      timesheet_status: "draft" | "submitted" | "approved" | "rejected";
      project_status: "active" | "on_hold" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
