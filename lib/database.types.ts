export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      orthos: {
        Row: {
          created_at: string
          gps_error: number | null
          id: string
          is_current: boolean
          num_images: number | null
          quality_score: number | null
          survey_id: string
          tile_folder: string | null
        }
        Insert: {
          created_at?: string
          gps_error?: number | null
          id: string
          is_current?: boolean
          num_images?: number | null
          quality_score?: number | null
          survey_id: string
          tile_folder?: string | null
        }
        Update: {
          created_at?: string
          gps_error?: number | null
          id?: string
          is_current?: boolean
          num_images?: number | null
          quality_score?: number | null
          survey_id?: string
          tile_folder?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orthos_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      point_clouds: {
        Row: {
          code: string
          created_at: string
          is_current: boolean
          num_points: number
          survey_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          is_current?: boolean
          num_points: number
          survey_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          is_current?: boolean
          num_points?: number
          survey_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_clouds_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_code: string | null
          alt_email: string | null
          barangay: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          fax: string | null
          first_name: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          mobile: string | null
          organization: string | null
          organization_id: string | null
          preferences: Json
          province: string | null
          region: string | null
          role: Database["public"]["Enums"]["app_role"]
          street: string | null
          suffix: string | null
          telephone: string | null
          updated_at: string
          village: string | null
          zip_code: string | null
        }
        Insert: {
          access_code?: string | null
          alt_email?: string | null
          barangay?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          middle_name?: string | null
          mobile?: string | null
          organization?: string | null
          organization_id?: string | null
          preferences?: Json
          province?: string | null
          region?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          street?: string | null
          suffix?: string | null
          telephone?: string | null
          updated_at?: string
          village?: string | null
          zip_code?: string | null
        }
        Update: {
          access_code?: string | null
          alt_email?: string | null
          barangay?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          mobile?: string | null
          organization?: string | null
          organization_id?: string | null
          preferences?: Json
          province?: string | null
          region?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          street?: string | null
          suffix?: string | null
          telephone?: string | null
          updated_at?: string
          village?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_fkey"
            columns: ["organization"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          access_code: string | null
          area: number | null
          area_code: string | null
          boundaries: string[] | null
          category: string | null
          client_id: string | null
          code: string | null
          created_by: string | null
          flight_date: string | null
          geojson_boundaries: string[] | null
          id: string
          location: string | null
          max_x: number | null
          max_y: number | null
          min_x: number | null
          min_y: number | null
          organization_code: string | null
          ortho: string | null
          point_cloud: string | null
          status: Database["public"]["Enums"]["mission_status"]
          tags: string[] | null
          tile_bounds_updated_at: string | null
          tile_max_x: number | null
          tile_max_y: number | null
          tile_min_x: number | null
          tile_min_y: number | null
          type: string | null
        }
        Insert: {
          access_code?: string | null
          area?: number | null
          area_code?: string | null
          boundaries?: string[] | null
          category?: string | null
          client_id?: string | null
          code?: string | null
          created_by?: string | null
          flight_date?: string | null
          geojson_boundaries?: string[] | null
          id?: string
          location?: string | null
          max_x?: number | null
          max_y?: number | null
          min_x?: number | null
          min_y?: number | null
          organization_code?: string | null
          ortho?: string | null
          point_cloud?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          tags?: string[] | null
          tile_bounds_updated_at?: string | null
          tile_max_x?: number | null
          tile_max_y?: number | null
          tile_min_x?: number | null
          tile_min_y?: number | null
          type?: string | null
        }
        Update: {
          access_code?: string | null
          area?: number | null
          area_code?: string | null
          boundaries?: string[] | null
          category?: string | null
          client_id?: string | null
          code?: string | null
          created_by?: string | null
          flight_date?: string | null
          geojson_boundaries?: string[] | null
          id?: string
          location?: string | null
          max_x?: number | null
          max_y?: number | null
          min_x?: number | null
          min_y?: number | null
          organization_code?: string | null
          ortho?: string | null
          point_cloud?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          tags?: string[] | null
          tile_bounds_updated_at?: string | null
          tile_max_x?: number | null
          tile_max_y?: number | null
          tile_min_x?: number | null
          tile_min_y?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_organization_code_fkey"
            columns: ["organization_code"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "surveys_ortho_fkey"
            columns: ["ortho"]
            isOneToOne: false
            referencedRelation: "orthos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_point_cloud_fkey"
            columns: ["point_cloud"]
            isOneToOne: false
            referencedRelation: "point_clouds"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "platform_admin" | "org_admin" | "editor" | "viewer"
      mission_status: "draft" | "processing" | "completed" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["platform_admin", "org_admin", "editor", "viewer"],
      mission_status: ["draft", "processing", "completed", "archived"],
    },
  },
} as const

