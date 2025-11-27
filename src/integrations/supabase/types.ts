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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      code_acceptances: {
        Row: {
          accepted_at: string | null
          accepted_version: number | null
          code_of_conduct_id: string | null
          event_id: string
          feedback_reminder_sent_at: string | null
          feedback_request_sent_at: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_version?: number | null
          code_of_conduct_id?: string | null
          event_id: string
          feedback_reminder_sent_at?: string | null
          feedback_request_sent_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_version?: number | null
          code_of_conduct_id?: string | null
          event_id?: string
          feedback_reminder_sent_at?: string | null
          feedback_request_sent_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "code_acceptances_code_of_conduct_id_fkey"
            columns: ["code_of_conduct_id"]
            isOneToOne: false
            referencedRelation: "code_of_conduct"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_acceptances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      code_of_conduct: {
        Row: {
          content: string | null
          content_type: string | null
          created_at: string | null
          event_id: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          name: string | null
          society_id: string | null
          version: number | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          event_id?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          society_id?: string | null
          version?: number | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          event_id?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          society_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "code_of_conduct_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_of_conduct_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_info: {
        Row: {
          created_at: string | null
          custom_emergency_info: Json | null
          event_id: string
          hospital_address: string | null
          hospital_phone: string | null
          id: string
          nearest_hospital: string | null
          nearest_pharmacy: string | null
          on_duty_contact: string | null
          on_duty_phone: string | null
          pharmacy_address: string | null
          pharmacy_phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_emergency_info?: Json | null
          event_id: string
          hospital_address?: string | null
          hospital_phone?: string | null
          id?: string
          nearest_hospital?: string | null
          nearest_pharmacy?: string | null
          on_duty_contact?: string | null
          on_duty_phone?: string | null
          pharmacy_address?: string | null
          pharmacy_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_emergency_info?: Json | null
          event_id?: string
          hospital_address?: string | null
          hospital_phone?: string | null
          id?: string
          nearest_hospital?: string | null
          nearest_pharmacy?: string | null
          on_duty_contact?: string | null
          on_duty_phone?: string | null
          pharmacy_address?: string | null
          pharmacy_phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_info_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_contacts: {
        Row: {
          contact_avatar_url: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          display_order: number | null
          event_id: string
          external_name: string | null
          external_phone: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          contact_avatar_url?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          display_order?: number | null
          event_id: string
          external_name?: string | null
          external_phone?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          contact_avatar_url?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          display_order?: number | null
          event_id?: string
          external_name?: string | null
          external_phone?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_contacts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_custom_categories: {
        Row: {
          category_name: string
          created_at: string | null
          event_id: string
          id: string
        }
        Insert: {
          category_name: string
          created_at?: string | null
          event_id: string
          id?: string
        }
        Update: {
          category_name?: string
          created_at?: string | null
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_custom_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_faqs: {
        Row: {
          answer: string
          created_at: string | null
          display_order: number
          event_id: string
          id: string
          is_visible: boolean
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          display_order?: number
          event_id: string
          id?: string
          is_visible?: boolean
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          display_order?: number
          event_id?: string
          id?: string
          is_visible?: boolean
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_faqs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          event_id: string
          felt_safe: string
          id: string
          improvements: string | null
          is_anonymous: boolean | null
          submitted_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          event_id: string
          felt_safe: string
          id?: string
          improvements?: string | null
          is_anonymous?: boolean | null
          submitted_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          event_id?: string
          felt_safe?: string
          id?: string
          improvements?: string | null
          is_anonymous?: boolean | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback_config: {
        Row: {
          auto_send_enabled: boolean
          auto_send_hours: number
          created_at: string | null
          enabled: boolean
          event_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          auto_send_enabled?: boolean
          auto_send_hours?: number
          created_at?: string | null
          enabled?: boolean
          event_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          auto_send_enabled?: boolean
          auto_send_hours?: number
          created_at?: string | null
          enabled?: boolean
          event_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_config_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback_questions: {
        Row: {
          allow_multiple_answers: boolean | null
          created_at: string | null
          display_order: number
          event_id: string
          id: string
          is_required: boolean
          options: Json | null
          placeholder_text: string | null
          question: string
          question_type: string
          updated_at: string | null
        }
        Insert: {
          allow_multiple_answers?: boolean | null
          created_at?: string | null
          display_order?: number
          event_id: string
          id?: string
          is_required?: boolean
          options?: Json | null
          placeholder_text?: string | null
          question: string
          question_type: string
          updated_at?: string | null
        }
        Update: {
          allow_multiple_answers?: boolean | null
          created_at?: string | null
          display_order?: number
          event_id?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          placeholder_text?: string | null
          question?: string
          question_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notes: {
        Row: {
          content: string
          created_at: string | null
          event_id: string
          id: string
          is_pinned: boolean | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          event_id: string
          id?: string
          is_pinned?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          event_id?: string
          id?: string
          is_pinned?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string
          event_end_date: string | null
          id: string
          location: string | null
          slug: string
          society_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date: string
          event_end_date?: string | null
          id?: string
          location?: string | null
          slug: string
          society_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_end_date?: string | null
          id?: string
          location?: string | null
          slug?: string
          society_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_answers: {
        Row: {
          answer_rating: number | null
          answer_text: string | null
          created_at: string
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer_rating?: number | null
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer_rating?: number | null
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "event_feedback_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "feedback_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          event_id: string
          id: string
          is_anonymous: boolean
          optional_name: string | null
          submitted_at: string
          submitter_email: string | null
          user_id: string | null
        }
        Insert: {
          event_id: string
          id?: string
          is_anonymous?: boolean
          optional_name?: string | null
          submitted_at?: string
          submitter_email?: string | null
          user_id?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          is_anonymous?: boolean
          optional_name?: string | null
          submitted_at?: string
          submitter_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_code_usage: {
        Row: {
          id: string
          invite_code: string
          ip_address: unknown
          referrer_url: string | null
          role_type: string
          society_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          id?: string
          invite_code: string
          ip_address?: unknown
          referrer_url?: string | null
          role_type: string
          society_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          id?: string
          invite_code?: string
          ip_address?: unknown
          referrer_url?: string | null
          role_type?: string
          society_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_code_usage_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found_items: {
        Row: {
          category: string
          contact_info: string | null
          description: string
          event_id: string
          id: string
          location: string | null
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          type: string
        }
        Insert: {
          category: string
          contact_info?: string | null
          description: string
          event_id: string
          id?: string
          location?: string | null
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          type: string
        }
        Update: {
          category?: string
          contact_info?: string | null
          description?: string
          event_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feedback: {
        Row: {
          created_at: string
          feedback_text: string
          id: string
          page_context: string | null
          submitted_at: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_text: string
          id?: string
          page_context?: string | null
          submitted_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_text?: string
          id?: string
          page_context?: string | null
          submitted_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          last_login_at: string | null
          phone_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          last_login_at?: string | null
          phone_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_login_at?: string | null
          phone_number?: string | null
        }
        Relationships: []
      }
      report_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_bookmarks_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          report_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          report_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_status_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          concern_type: string
          description: string
          event_id: string
          first_response_at: string | null
          id: string
          is_anonymous: boolean | null
          notes: string | null
          reporter_email: string | null
          reporter_name: string | null
          reporter_phone: string | null
          resolved_at: string | null
          response_time_minutes: number | null
          severity: string | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          concern_type: string
          description: string
          event_id: string
          first_response_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          notes?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          resolved_at?: string | null
          response_time_minutes?: number | null
          severity?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          concern_type?: string
          description?: string
          event_id?: string
          first_response_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          notes?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          resolved_at?: string | null
          response_time_minutes?: number | null
          severity?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_page_views: {
        Row: {
          event_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          event_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_page_views_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      societies: {
        Row: {
          activation_date: string | null
          attendee_invite_code: string
          committee_invite_code: string
          created_at: string | null
          creator_email: string | null
          id: string
          is_verified: boolean
          logo_url: string | null
          member_count: number
          name: string
          slug: string
          university_name: string | null
          updated_at: string | null
        }
        Insert: {
          activation_date?: string | null
          attendee_invite_code?: string
          committee_invite_code?: string
          created_at?: string | null
          creator_email?: string | null
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          member_count?: number
          name: string
          slug: string
          university_name?: string | null
          updated_at?: string | null
        }
        Update: {
          activation_date?: string | null
          attendee_invite_code?: string
          committee_invite_code?: string
          created_at?: string | null
          creator_email?: string | null
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          member_count?: number
          name?: string
          slug?: string
          university_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      society_members: {
        Row: {
          email_notifications_enabled: boolean
          id: string
          joined_at: string | null
          role: Database["public"]["Enums"]["society_member_role"]
          society_id: string
          user_id: string
        }
        Insert: {
          email_notifications_enabled?: boolean
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["society_member_role"]
          society_id: string
          user_id: string
        }
        Update: {
          email_notifications_enabled?: boolean
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["society_member_role"]
          society_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "society_members_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          event_id: string | null
          id: string
          metadata: Json | null
          society_id: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          society_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          society_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_logs_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          accepted_at: string
          accepted_terms: boolean
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          accepted_terms?: boolean
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          accepted_terms?: boolean
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_metrics: {
        Row: {
          active_societies: number | null
          active_users: number | null
          avg_safety_score: number | null
          created_at: string | null
          id: string
          new_events: number | null
          new_feedback: number | null
          new_reports: number | null
          new_societies: number | null
          new_users: number | null
          resolved_reports: number | null
          total_events: number | null
          total_feedback: number | null
          total_reports: number | null
          total_societies: number | null
          total_users: number | null
          week_start: string
        }
        Insert: {
          active_societies?: number | null
          active_users?: number | null
          avg_safety_score?: number | null
          created_at?: string | null
          id?: string
          new_events?: number | null
          new_feedback?: number | null
          new_reports?: number | null
          new_societies?: number | null
          new_users?: number | null
          resolved_reports?: number | null
          total_events?: number | null
          total_feedback?: number | null
          total_reports?: number | null
          total_societies?: number | null
          total_users?: number | null
          week_start: string
        }
        Update: {
          active_societies?: number | null
          active_users?: number | null
          avg_safety_score?: number | null
          created_at?: string | null
          id?: string
          new_events?: number | null
          new_feedback?: number | null
          new_reports?: number | null
          new_societies?: number | null
          new_users?: number | null
          resolved_reports?: number | null
          total_events?: number | null
          total_feedback?: number | null
          total_reports?: number | null
          total_societies?: number | null
          total_users?: number | null
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: { Args: never; Returns: string }
      get_society_basic_info: {
        Args: { society_id: string }
        Returns: {
          created_at: string
          description: string
          id: string
          name: string
          slug: string
          updated_at: string
        }[]
      }
      get_society_invite_codes: {
        Args: { society_id: string }
        Returns: {
          attendee_invite_code: string
          committee_invite_code: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_committee_member: {
        Args: { _society_id: string; _user_id: string }
        Returns: boolean
      }
      is_committee_member_by_email: {
        Args: { _email: string; _society_id: string }
        Returns: boolean
      }
      is_society_creator: {
        Args: { _society_id: string; _user_id: string }
        Returns: boolean
      }
      is_society_member: {
        Args: { _society_id: string; _user_id: string }
        Returns: boolean
      }
      validate_invite_code: {
        Args: { invite_code: string }
        Returns: {
          role_type: string
          society_id: string
          society_name: string
          society_slug: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      society_member_role: "committee" | "attendee"
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
      app_role: ["admin", "user"],
      society_member_role: ["committee", "attendee"],
    },
  },
} as const
