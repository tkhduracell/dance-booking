export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
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
      access_requests: {
        Row: {
          community_role: string | null;
          created_at: string;
          deny_reason: string | null;
          email: string;
          id: string;
          message: string | null;
          name: string;
          provider: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          tenant_id: string;
          user_id: string;
        };
        Insert: {
          community_role?: string | null;
          created_at?: string;
          deny_reason?: string | null;
          email: string;
          id?: string;
          message?: string | null;
          name: string;
          provider?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          tenant_id: string;
          user_id: string;
        };
        Update: {
          community_role?: string | null;
          created_at?: string;
          deny_reason?: string | null;
          email?: string;
          id?: string;
          message?: string | null;
          name?: string;
          provider?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          tenant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_requests_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_smtp_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_requests_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: {
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          booking_id: string | null;
          created_at: string;
          id: string;
          tenant_id: string;
          type: string;
        };
        Insert: {
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          tenant_id: string;
          type: string;
        };
        Update: {
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          tenant_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_smtp_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          booked_by: string | null;
          category_id: string;
          conflict_occasion_id: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          room_id: string;
          starts_at: string;
          status: string;
          tenant_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          booked_by?: string | null;
          category_id: string;
          conflict_occasion_id?: string | null;
          created_at?: string;
          ends_at: string;
          id?: string;
          room_id: string;
          starts_at: string;
          status?: string;
          tenant_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          booked_by?: string | null;
          category_id?: string;
          conflict_occasion_id?: string | null;
          created_at?: string;
          ends_at?: string;
          id?: string;
          room_id?: string;
          starts_at?: string;
          status?: string;
          tenant_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_conflict_occasion_fk";
            columns: ["conflict_occasion_id"];
            isOneToOne: false;
            referencedRelation: "imported_occasions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_smtp_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          active: boolean;
          color: string;
          id: string;
          name: string;
          sort_order: number;
          tenant_id: string;
        };
        Insert: {
          active?: boolean;
          color: string;
          id?: string;
          name: string;
          sort_order?: number;
          tenant_id: string;
        };
        Update: {
          active?: boolean;
          color?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_smtp_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "categories_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      imported_courses: {
        Row: {
          category: string | null;
          dans_se_id: string;
          dans_se_key: string | null;
          id: string;
          instructors: string | null;
          name: string;
          place: string | null;
          removed_at: string | null;
          schedule_text: string | null;
          source_url: string | null;
          synced_at: string;
          tenant_id: string;
        };
        Insert: {
          category?: string | null;
          dans_se_id: string;
          dans_se_key?: string | null;
          id?: string;
          instructors?: string | null;
          name: string;
          place?: string | null;
          removed_at?: string | null;
          schedule_text?: string | null;
          source_url?: string | null;
          synced_at?: string;
          tenant_id: string;
        };
        Update: {
          category?: string | null;
          dans_se_id?: string;
          dans_se_key?: string | null;
          id?: string;
          instructors?: string | null;
          name?: string;
          place?: string | null;
          removed_at?: string | null;
          schedule_text?: string | null;
          source_url?: string | null;
          synced_at?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "imported_courses_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_smtp_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "imported_courses_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      imported_occasions: {
        Row: {
          course_id: string;
          ends_at: string;
          id: string;
          starts_at: string;
          tenant_id: string;
        };
        Insert: {
          course_id: string;
          ends_at: string;
          id?: string;
          starts_at: string;
          tenant_id: string;
        };
        Update: {
          course_id?: string;
          ends_at?: string;
          id?: string;
          starts_at?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "imported_occasions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "imported_courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "imported_occasions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_smtp_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "imported_occasions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          role_id: string;
          tenant_id: string;
          user_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          role_id: string;
          tenant_id: string;
          user_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          role_id?: string;
          tenant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_smtp_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          action: string;
          created_at: string;
          description: string | null;
          id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          description?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          email: string;
        };
        Insert: {
          email: string;
        };
        Update: {
          email?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          permission_id: string;
          role_id: string;
        };
        Insert: {
          permission_id: string;
          role_id: string;
        };
        Update: {
          permission_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          active: boolean;
          description: string | null;
          id: string;
          sort_order: number;
          tenant_id: string;
          title: string;
        };
        Insert: {
          active?: boolean;
          description?: string | null;
          id?: string;
          sort_order?: number;
          tenant_id: string;
          title: string;
        };
        Update: {
          active?: boolean;
          description?: string | null;
          id?: string;
          sort_order?: number;
          tenant_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_smtp_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rooms_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_domains: {
        Row: {
          domain: string;
          tenant_id: string;
        };
        Insert: {
          domain: string;
          tenant_id: string;
        };
        Update: {
          domain?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_smtp_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          active: boolean;
          bg_gradient_from: string | null;
          bg_gradient_to: string | null;
          bg_gradient_via: string | null;
          course_room_id: string | null;
          created_at: string;
          dans_se_last_sync_error: string | null;
          dans_se_last_synced_at: string | null;
          dans_se_org: string | null;
          dans_se_token_enc: string | null;
          id: string;
          logo_path: string | null;
          logo_url: string | null;
          max_days_ahead: number;
          name: string;
          slug: string;
          smtp_from_address: string | null;
          smtp_from_name: string | null;
          smtp_host: string | null;
          smtp_password_enc: string | null;
          smtp_port: number | null;
          smtp_security: string | null;
          smtp_test_at: string | null;
          smtp_test_error: string | null;
          smtp_test_ok: boolean;
          smtp_user: string | null;
          theme: Json | null;
          timezone: string;
        };
        Insert: {
          active?: boolean;
          bg_gradient_from?: string | null;
          bg_gradient_to?: string | null;
          bg_gradient_via?: string | null;
          course_room_id?: string | null;
          created_at?: string;
          dans_se_last_sync_error?: string | null;
          dans_se_last_synced_at?: string | null;
          dans_se_org?: string | null;
          dans_se_token_enc?: string | null;
          id?: string;
          logo_path?: string | null;
          logo_url?: string | null;
          max_days_ahead?: number;
          name: string;
          slug: string;
          smtp_from_address?: string | null;
          smtp_from_name?: string | null;
          smtp_host?: string | null;
          smtp_password_enc?: string | null;
          smtp_port?: number | null;
          smtp_security?: string | null;
          smtp_test_at?: string | null;
          smtp_test_error?: string | null;
          smtp_test_ok?: boolean;
          smtp_user?: string | null;
          theme?: Json | null;
          timezone?: string;
        };
        Update: {
          active?: boolean;
          bg_gradient_from?: string | null;
          bg_gradient_to?: string | null;
          bg_gradient_via?: string | null;
          course_room_id?: string | null;
          created_at?: string;
          dans_se_last_sync_error?: string | null;
          dans_se_last_synced_at?: string | null;
          dans_se_org?: string | null;
          dans_se_token_enc?: string | null;
          id?: string;
          logo_path?: string | null;
          logo_url?: string | null;
          max_days_ahead?: number;
          name?: string;
          slug?: string;
          smtp_from_address?: string | null;
          smtp_from_name?: string | null;
          smtp_host?: string | null;
          smtp_password_enc?: string | null;
          smtp_port?: number | null;
          smtp_security?: string | null;
          smtp_test_at?: string | null;
          smtp_test_error?: string | null;
          smtp_test_ok?: boolean;
          smtp_user?: string | null;
          theme?: Json | null;
          timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenants_course_room_fk";
            columns: ["course_room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      tenant_smtp_status: {
        Row: {
          dans_se_last_sync_error: string | null;
          dans_se_last_synced_at: string | null;
          dans_se_org: string | null;
          dans_se_token_set: boolean | null;
          id: string | null;
          slug: string | null;
          smtp_from_address: string | null;
          smtp_from_name: string | null;
          smtp_host: string | null;
          smtp_password_set: boolean | null;
          smtp_port: number | null;
          smtp_security: string | null;
          smtp_test_at: string | null;
          smtp_test_error: string | null;
          smtp_test_ok: boolean | null;
          smtp_user: string | null;
        };
        Insert: {
          dans_se_last_sync_error?: string | null;
          dans_se_last_synced_at?: string | null;
          dans_se_org?: string | null;
          dans_se_token_set?: never;
          id?: string | null;
          slug?: string | null;
          smtp_from_address?: string | null;
          smtp_from_name?: string | null;
          smtp_host?: string | null;
          smtp_password_set?: never;
          smtp_port?: number | null;
          smtp_security?: string | null;
          smtp_test_at?: string | null;
          smtp_test_error?: string | null;
          smtp_test_ok?: boolean | null;
          smtp_user?: string | null;
        };
        Update: {
          dans_se_last_sync_error?: string | null;
          dans_se_last_synced_at?: string | null;
          dans_se_org?: string | null;
          dans_se_token_set?: never;
          id?: string | null;
          slug?: string | null;
          smtp_from_address?: string | null;
          smtp_from_name?: string | null;
          smtp_host?: string | null;
          smtp_password_set?: never;
          smtp_port?: number | null;
          smtp_security?: string | null;
          smtp_test_at?: string | null;
          smtp_test_error?: string | null;
          smtp_test_ok?: boolean | null;
          smtp_user?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_count_in_tenant: { Args: { p_tenant_id: string }; Returns: number };
      cancel_booking_with_log: {
        Args: { p_actor_id: string; p_booking_id: string; p_tenant_id: string };
        Returns: {
          booked_by: string | null;
          category_id: string;
          conflict_occasion_id: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          room_id: string;
          starts_at: string;
          status: string;
          tenant_id: string;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_booking_with_log: {
        Args: {
          p_actor_id: string;
          p_booked_by: string;
          p_category_id: string;
          p_ends_at: string;
          p_room_id: string;
          p_starts_at: string;
          p_tenant_id: string;
          p_title: string;
        };
        Returns: {
          booked_by: string | null;
          category_id: string;
          conflict_occasion_id: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          room_id: string;
          starts_at: string;
          status: string;
          tenant_id: string;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_imported_courses_with_conflicts: {
        Args: { p_tenant_id: string };
        Returns: {
          conflicts_count: number;
          course_id: string;
          name: string;
          occasions_count: number;
          schedule_text: string;
        }[];
      };
      get_tenant_members: {
        Args: { p_tenant_id: string };
        Returns: {
          email: string;
          name: string;
          roles: string[];
          user_id: string;
        }[];
      };
      get_user_display_names: {
        Args: { p_user_ids: string[] };
        Returns: {
          id: string;
          name: string;
        }[];
      };
      get_user_roles_in_tenant: {
        Args: { p_tenant_id: string; p_user_id: string };
        Returns: {
          role_name: string;
        }[];
      };
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean };
      is_tenant_admin: { Args: { p_tenant_id: string; p_user_id: string }; Returns: boolean };
      is_tenant_member: { Args: { p_tenant_id: string; p_user_id: string }; Returns: boolean };
      update_booking_with_log: {
        Args: {
          p_actor_id: string;
          p_booking_id: string;
          p_category_id: string;
          p_ends_at: string;
          p_log_type: string;
          p_room_id: string;
          p_starts_at: string;
          p_tenant_id: string;
          p_title: string;
        };
        Returns: {
          booked_by: string | null;
          category_id: string;
          conflict_occasion_id: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          room_id: string;
          starts_at: string;
          status: string;
          tenant_id: string;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      user_has_permission_in_tenant: {
        Args: { p_action: string; p_tenant_id: string; p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
