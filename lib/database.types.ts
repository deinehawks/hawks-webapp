export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_profile_id: string | null
          id: string
          metadata: Json
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
          record_pk: Json
          table_name: string
          table_schema: string
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          id?: string
          metadata?: Json
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_pk?: Json
          table_name: string
          table_schema: string
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          id?: string
          metadata?: Json
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_pk?: Json
          table_name?: string
          table_schema?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_organizations: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          is_primary: boolean
          notes: string | null
          organization_id: string
          relationship_type: Database["public"]["Enums"]["domain_relationship_type"]
          review_status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          is_primary?: boolean
          notes?: string | null
          organization_id: string
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          is_primary?: boolean
          notes?: string | null
          organization_id?: string
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "client_organizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_people: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          is_primary: boolean
          notes: string | null
          person_id: string
          relationship_type: Database["public"]["Enums"]["domain_relationship_type"]
          review_status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          is_primary?: boolean
          notes?: string | null
          person_id: string
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          is_primary?: boolean
          notes?: string | null
          person_id?: string
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "client_people_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          classification_kind: Database["public"]["Enums"]["client_classification_kind"]
          classification_notes: string | null
          classification_reviewed_at: string | null
          classification_reviewed_by: string | null
          code: string
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          classification_kind?: Database["public"]["Enums"]["client_classification_kind"]
          classification_notes?: string | null
          classification_reviewed_at?: string | null
          classification_reviewed_by?: string | null
          code: string
          created_at?: string
          id?: string
          name?: string | null
        }
        Update: {
          classification_kind?: Database["public"]["Enums"]["client_classification_kind"]
          classification_notes?: string | null
          classification_reviewed_at?: string | null
          classification_reviewed_by?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_classification_reviewed_by_fkey"
            columns: ["classification_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_access_grants: {
        Row: {
          created_at: string
          expires_at: string | null
          farm_id: string
          granted_by: string | null
          id: string
          profile_id: string
          reason: string | null
          revoked_by: string | null
          status: Database["public"]["Enums"]["access_grant_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          farm_id: string
          granted_by?: string | null
          id?: string
          profile_id: string
          reason?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["access_grant_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          farm_id?: string
          granted_by?: string | null
          id?: string
          profile_id?: string
          reason?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["access_grant_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_access_grants_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_access_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_access_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_organizations: {
        Row: {
          created_at: string
          created_by: string | null
          farm_id: string
          notes: string | null
          organization_id: string
          relationship_type: Database["public"]["Enums"]["domain_relationship_type"]
          review_status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          farm_id: string
          notes?: string | null
          organization_id: string
          relationship_type: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          farm_id?: string
          notes?: string | null
          organization_id?: string
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "farm_organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_organizations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_people: {
        Row: {
          created_at: string
          created_by: string | null
          farm_id: string
          notes: string | null
          person_id: string
          relationship_type: Database["public"]["Enums"]["domain_relationship_type"]
          review_status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          farm_id: string
          notes?: string | null
          person_id: string
          relationship_type: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          farm_id?: string
          notes?: string | null
          person_id?: string
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "farm_people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_people_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          area_hectares: number | null
          boundary_geojson: Json | null
          code: string | null
          created_at: string
          created_by: string | null
          crop: string
          id: string
          location_name: string | null
          name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          area_hectares?: number | null
          boundary_geojson?: Json | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          crop?: string
          id?: string
          location_name?: string | null
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          area_hectares?: number | null
          boundary_geojson?: Json | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          crop?: string
          id?: string
          location_name?: string | null
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          notes: string | null
          organization_id: string
          profile_id: string
          removed_at: string | null
          role: Database["public"]["Enums"]["membership_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          notes?: string | null
          organization_id: string
          profile_id: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          notes?: string | null
          organization_id?: string
          profile_id?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_people: {
        Row: {
          created_at: string
          created_by: string | null
          notes: string | null
          organization_id: string
          person_id: string
          relationship_type: Database["public"]["Enums"]["domain_relationship_type"]
          review_status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          organization_id: string
          person_id: string
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          organization_id?: string
          person_id?: string
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "organization_people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_types: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      organizations: {
        Row: {
          barangay: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          mobile: string | null
          name: string
          notes: string | null
          province: string | null
          region: string | null
          status: string
          street: string | null
          telephone: string | null
          type_code: string
          updated_at: string
          village: string | null
          zip_code: string | null
        }
        Insert: {
          barangay?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          mobile?: string | null
          name: string
          notes?: string | null
          province?: string | null
          region?: string | null
          status?: string
          street?: string | null
          telephone?: string | null
          type_code: string
          updated_at?: string
          village?: string | null
          zip_code?: string | null
        }
        Update: {
          barangay?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          mobile?: string | null
          name?: string
          notes?: string | null
          province?: string | null
          region?: string | null
          status?: string
          street?: string | null
          telephone?: string | null
          type_code?: string
          updated_at?: string
          village?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_type_code_fkey"
            columns: ["type_code"]
            isOneToOne: false
            referencedRelation: "organization_types"
            referencedColumns: ["code"]
          },
        ]
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
      people: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          mobile: string | null
          notes: string | null
          status: string
          suffix: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          mobile?: string | null
          notes?: string | null
          status?: string
          suffix?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          mobile?: string | null
          notes?: string | null
          status?: string
          suffix?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          account_role: Database["public"]["Enums"]["account_role"]
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
          person_id: string | null
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
          account_role?: Database["public"]["Enums"]["account_role"]
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
          person_id?: string | null
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
          account_role?: Database["public"]["Enums"]["account_role"]
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
          person_id?: string | null
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
          {
            foreignKeyName: "profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_access_grants: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          profile_id: string
          reason: string | null
          revoked_by: string | null
          status: Database["public"]["Enums"]["access_grant_status"]
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          profile_id: string
          reason?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["access_grant_status"]
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          profile_id?: string
          reason?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["access_grant_status"]
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_access_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_access_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_access_grants_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_farms: {
        Row: {
          area_covered_hectares: number | null
          created_at: string
          created_by: string | null
          farm_id: string
          is_primary: boolean
          notes: string | null
          relationship_type: Database["public"]["Enums"]["domain_relationship_type"]
          survey_id: string
        }
        Insert: {
          area_covered_hectares?: number | null
          created_at?: string
          created_by?: string | null
          farm_id: string
          is_primary?: boolean
          notes?: string | null
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          survey_id: string
        }
        Update: {
          area_covered_hectares?: number | null
          created_at?: string
          created_by?: string | null
          farm_id?: string
          is_primary?: boolean
          notes?: string | null
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_farms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_farms_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_farms_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_organizations: {
        Row: {
          created_at: string
          created_by: string | null
          notes: string | null
          organization_id: string
          relationship_type: Database["public"]["Enums"]["domain_relationship_type"]
          review_status: Database["public"]["Enums"]["review_status"]
          survey_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          organization_id: string
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
          survey_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          organization_id?: string
          relationship_type?: Database["public"]["Enums"]["domain_relationship_type"]
          review_status?: Database["public"]["Enums"]["review_status"]
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_organizations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_outputs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_current: boolean
          metadata: Json
          output_type: string
          status: Database["public"]["Enums"]["output_status"]
          storage_bucket: string | null
          storage_path: string | null
          survey_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_current?: boolean
          metadata?: Json
          output_type: string
          status?: Database["public"]["Enums"]["output_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          survey_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_current?: boolean
          metadata?: Json
          output_type?: string
          status?: Database["public"]["Enums"]["output_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          survey_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_outputs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_outputs_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
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
      access_grant_status: "active" | "revoked" | "expired"
      account_role: "platform_admin" | "individual"
      app_role: "platform_admin" | "org_admin" | "editor" | "viewer"
      client_classification_kind:
        | "unclassified"
        | "organization"
        | "individual"
        | "other"
      domain_relationship_type:
        | "owner"
        | "operator"
        | "representative"
        | "contact"
        | "member"
        | "requester"
        | "participant"
        | "legacy_client"
        | "other"
      membership_role: "org_admin" | "member"
      membership_status:
        | "invited"
        | "pending"
        | "active"
        | "removed"
        | "suspended"
      mission_status: "draft" | "processing" | "completed" | "archived"
      output_status: "draft" | "ready" | "approved" | "published" | "archived"
      review_status: "pending" | "confirmed" | "rejected"
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
      access_grant_status: ["active", "revoked", "expired"],
      account_role: ["platform_admin", "individual"],
      app_role: ["platform_admin", "org_admin", "editor", "viewer"],
      client_classification_kind: [
        "unclassified",
        "organization",
        "individual",
        "other",
      ],
      domain_relationship_type: [
        "owner",
        "operator",
        "representative",
        "contact",
        "member",
        "requester",
        "participant",
        "legacy_client",
        "other",
      ],
      membership_role: ["org_admin", "member"],
      membership_status: [
        "invited",
        "pending",
        "active",
        "removed",
        "suspended",
      ],
      mission_status: ["draft", "processing", "completed", "archived"],
      output_status: ["draft", "ready", "approved", "published", "archived"],
      review_status: ["pending", "confirmed", "rejected"],
    },
  },
} as const
