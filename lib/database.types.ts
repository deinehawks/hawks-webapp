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
      account_signup_approvals: {
        Row: {
          approved_by: string
          claimed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          initial_role: Database["public"]["Enums"]["membership_role"]
          notes: string | null
          organization_id: string
          registered_profile_id: string | null
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_by: string
          claimed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          initial_role?: Database["public"]["Enums"]["membership_role"]
          notes?: string | null
          organization_id: string
          registered_profile_id?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string
          claimed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          initial_role?: Database["public"]["Enums"]["membership_role"]
          notes?: string | null
          organization_id?: string
          registered_profile_id?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_signup_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_signup_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_signup_approvals_registered_profile_id_fkey"
            columns: ["registered_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_signup_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          initial_role: Database["public"]["Enums"]["membership_role"] | null
          organization_id: string | null
          profile_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          initial_role?: Database["public"]["Enums"]["membership_role"] | null
          organization_id?: string | null
          profile_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          initial_role?: Database["public"]["Enums"]["membership_role"] | null
          organization_id?: string | null
          profile_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_signup_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_signup_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_signup_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "farm_access_grants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      organization_user_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          requested_by: string
          requested_email: string
          requested_name: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          requested_by: string
          requested_email: string
          requested_name?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          requested_by?: string
          requested_email?: string
          requested_name?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_user_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_user_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_user_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          account_status: string
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
          account_status?: string
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
          account_status?: string
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "survey_access_grants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      workshop_manifest_entries: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          destination_prefix_alias: string | null
          destination_storage_alias: string | null
          display_label: string | null
          entry_type: string
          farm_id: string | null
          id: string
          manifest_id: string
          metadata: Json
          nginx_route_pattern: string | null
          notes: string | null
          organization_id: string | null
          output_id: string | null
          profile_id: string | null
          protection_level: string
          reference_key: string
          source_alias: string | null
          survey_id: string | null
          updated_at: string
          verification: Json
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          destination_prefix_alias?: string | null
          destination_storage_alias?: string | null
          display_label?: string | null
          entry_type: string
          farm_id?: string | null
          id?: string
          manifest_id: string
          metadata?: Json
          nginx_route_pattern?: string | null
          notes?: string | null
          organization_id?: string | null
          output_id?: string | null
          profile_id?: string | null
          protection_level?: string
          reference_key: string
          source_alias?: string | null
          survey_id?: string | null
          updated_at?: string
          verification?: Json
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          destination_prefix_alias?: string | null
          destination_storage_alias?: string | null
          display_label?: string | null
          entry_type?: string
          farm_id?: string | null
          id?: string
          manifest_id?: string
          metadata?: Json
          nginx_route_pattern?: string | null
          notes?: string | null
          organization_id?: string | null
          output_id?: string | null
          profile_id?: string | null
          protection_level?: string
          reference_key?: string
          source_alias?: string | null
          survey_id?: string | null
          updated_at?: string
          verification?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workshop_manifest_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_manifest_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_manifest_entries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_manifest_entries_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "workshop_manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_manifest_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_manifest_entries_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "survey_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_manifest_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_manifest_entries_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_manifests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          backup_exported_at: string | null
          backup_object_alias: string | null
          backup_storage_alias: string | null
          created_at: string
          created_by: string | null
          dataset_year: number
          description: string | null
          id: string
          is_active: boolean
          manifest_key: string
          metadata: Json
          notes: string | null
          status: string
          superseded_by_manifest_id: string | null
          supersedes_manifest_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          backup_exported_at?: string | null
          backup_object_alias?: string | null
          backup_storage_alias?: string | null
          created_at?: string
          created_by?: string | null
          dataset_year?: number
          description?: string | null
          id?: string
          is_active?: boolean
          manifest_key: string
          metadata?: Json
          notes?: string | null
          status?: string
          superseded_by_manifest_id?: string | null
          supersedes_manifest_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          backup_exported_at?: string | null
          backup_object_alias?: string | null
          backup_storage_alias?: string | null
          created_at?: string
          created_by?: string | null
          dataset_year?: number
          description?: string | null
          id?: string
          is_active?: boolean
          manifest_key?: string
          metadata?: Json
          notes?: string | null
          status?: string
          superseded_by_manifest_id?: string | null
          supersedes_manifest_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_manifests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_manifests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_manifests_superseded_by_manifest_id_fkey"
            columns: ["superseded_by_manifest_id"]
            isOneToOne: false
            referencedRelation: "workshop_manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_manifests_supersedes_manifest_id_fkey"
            columns: ["supersedes_manifest_id"]
            isOneToOne: false
            referencedRelation: "workshop_manifests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_organization_user_request: {
        Args: { target_request_id: string; target_review_notes?: string }
        Returns: string
      }
      admin_approve_signup_request: {
        Args: {
          target_initial_role: Database["public"]["Enums"]["membership_role"]
          target_organization_id: string
          target_request_id: string
          target_review_notes?: string
        }
        Returns: string
      }
      admin_confirm_client_organization_mapping: {
        Args: {
          mapping_notes?: string
          target_client_id: string
          target_organization_id: string
        }
        Returns: undefined
      }
      admin_confirm_client_person_mapping: {
        Args: {
          mapping_notes?: string
          target_client_id: string
          target_person_id: string
        }
        Returns: undefined
      }
      admin_create_organization_for_client_mapping: {
        Args: {
          mapping_notes?: string
          organization_code?: string
          organization_name: string
          organization_notes?: string
          organization_type_code: string
          target_client_id: string
        }
        Returns: string
      }
      admin_create_person_for_client_mapping: {
        Args: {
          mapping_notes?: string
          person_display_name: string
          person_first_name?: string
          person_last_name?: string
          person_mobile?: string
          person_notes?: string
          target_client_id: string
        }
        Returns: string
      }
      admin_reject_organization_user_request: {
        Args: { target_request_id: string; target_review_notes?: string }
        Returns: string
      }
      admin_reject_signup_request: {
        Args: { target_request_id: string; target_review_notes?: string }
        Returns: undefined
      }
      admin_set_current_survey_output: {
        Args: { target_output_id: string }
        Returns: undefined
      }
      authorize_workshop_protected_asset: {
        Args: {
          requested_dataset_year: number
          requested_entry_type: string
          requested_original_uri: string
          requested_survey_id: string
        }
        Returns: {
          client_id: string
          destination_prefix_alias: string
          destination_storage_alias: string
          entry_id: string
          entry_type: string
          manifest_id: string
          metadata: Json
          organization_id: string
          protection_level: string
          reference_key: string
          survey_id: string
        }[]
      }
      claim_approved_signup: { Args: never; Returns: string }
      org_admin_cancel_user_request: {
        Args: { request_id: string }
        Returns: string
      }
      org_admin_create_farm: {
        Args: {
          farm_area_hectares?: number
          farm_code?: string
          farm_crop?: string
          farm_location_name?: string
          farm_name: string
          farm_notes?: string
        }
        Returns: string
      }
      org_admin_create_farm_grant: {
        Args: {
          grant_reason?: string
          target_farm_id: string
          target_profile_id: string
        }
        Returns: string
      }
      org_admin_create_survey_grant: {
        Args: {
          grant_reason?: string
          target_profile_id: string
          target_survey_id: string
        }
        Returns: string
      }
      org_admin_create_user_request: {
        Args: { email: string; name?: string; request_notes?: string }
        Returns: string
      }
      org_admin_promote_member: {
        Args: { membership_id: string }
        Returns: string
      }
      org_admin_set_farm_grant_status: {
        Args: {
          grant_id: string
          grant_reason?: string
          next_status: Database["public"]["Enums"]["access_grant_status"]
        }
        Returns: string
      }
      org_admin_set_survey_grant_status: {
        Args: {
          grant_id: string
          grant_reason?: string
          next_status: Database["public"]["Enums"]["access_grant_status"]
        }
        Returns: string
      }
      org_admin_update_farm: {
        Args: {
          farm_area_hectares?: number
          farm_code?: string
          farm_crop?: string
          farm_id: string
          farm_location_name?: string
          farm_name: string
          farm_notes?: string
          farm_status?: string
        }
        Returns: string
      }
      org_admin_update_member_status: {
        Args: {
          membership_id: string
          membership_notes?: string
          next_status: Database["public"]["Enums"]["membership_status"]
        }
        Returns: string
      }
      org_admin_update_organization: {
        Args: {
          organization_barangay?: string
          organization_city?: string
          organization_code: string
          organization_country?: string
          organization_email?: string
          organization_mobile?: string
          organization_name: string
          organization_notes?: string
          organization_province?: string
          organization_region?: string
          organization_street?: string
          organization_telephone?: string
          organization_type_code: string
          organization_village?: string
          organization_zip_code?: string
          target_organization_id: string
        }
        Returns: string
      }
      platform_admin_update_survey: {
        Args: {
          survey_area?: number
          survey_area_code?: string
          survey_category?: string
          survey_flight_date?: string
          survey_id: string
          survey_location?: string
          survey_status?: Database["public"]["Enums"]["mission_status"]
          survey_type?: string
        }
        Returns: string
      }
    }
    Enums: {
      access_grant_status: "active" | "revoked" | "expired"
      app_role: "platform_admin" | "org_admin" | "editor" | "viewer" | "user"
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
      app_role: ["platform_admin", "org_admin", "editor", "viewer", "user"],
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
