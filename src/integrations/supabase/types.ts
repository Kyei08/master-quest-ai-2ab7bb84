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
      alternative_questions: {
        Row: {
          assignment_id: string | null
          created_at: string
          id: string
          original_question_index: number
          reasoning: string | null
          status: Database["public"]["Enums"]["content_status"]
          suggested_by: string
          suggested_question: string
          updated_at: string
          upvotes: number
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          id?: string
          original_question_index: number
          reasoning?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          suggested_by: string
          suggested_question: string
          updated_at?: string
          upvotes?: number
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          id?: string
          original_question_index?: number
          reasoning?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          suggested_by?: string
          suggested_question?: string
          updated_at?: string
          upvotes?: number
        }
        Relationships: [
          {
            foreignKeyName: "alternative_questions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alternative_questions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "content_quality_metrics"
            referencedColumns: ["content_id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          answers: Json
          assignment_id: string
          created_at: string
          feedback: string | null
          id: string
          module_id: string
          score: number | null
          status: string
          submitted_at: string
          total_marks: number
        }
        Insert: {
          answers: Json
          assignment_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          module_id: string
          score?: number | null
          status?: string
          submitted_at?: string
          total_marks: number
        }
        Update: {
          answers?: Json
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          module_id?: string
          score?: number | null
          status?: string
          submitted_at?: string
          total_marks?: number
        }
        Relationships: []
      }
      assignments: {
        Row: {
          average_rating: number | null
          content: Json
          content_status: Database["public"]["Enums"]["content_status"]
          created_at: string | null
          id: string
          last_rated_at: string | null
          module_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          total_ratings: number | null
        }
        Insert: {
          average_rating?: number | null
          content: Json
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string | null
          id?: string
          last_rated_at?: string | null
          module_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          total_ratings?: number | null
        }
        Update: {
          average_rating?: number | null
          content?: Json
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string | null
          id?: string
          last_rated_at?: string | null
          module_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          total_ratings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reviews: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          feedback: string | null
          id: string
          rating: number | null
          reviewer_id: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          reviewer_id: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          reviewer_id?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
      discussion_replies: {
        Row: {
          content: string
          created_at: string
          discussion_id: string
          id: string
          is_best_answer: boolean
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          discussion_id: string
          id?: string
          is_best_answer?: boolean
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          discussion_id?: string
          id?: string
          is_best_answer?: boolean
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_upvotes: {
        Row: {
          created_at: string
          discussion_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_upvotes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_upvotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          best_answer_id: string | null
          content: string
          created_at: string
          id: string
          is_resolved: boolean
          module_id: string
          title: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          best_answer_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          module_id: string
          title: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          best_answer_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          module_id?: string
          title?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_members: {
        Row: {
          id: string
          joined_at: string
          module_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          module_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          module_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_members_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_progress_drafts: {
        Row: {
          created_at: string
          data: Json
          draft_type: string
          id: string
          module_id: string
          quiz_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          draft_type: string
          id?: string
          module_id: string
          quiz_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          draft_type?: string
          id?: string
          module_id?: string
          quiz_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_progress_drafts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_shares: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          module_id: string
          share_token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          module_id: string
          share_token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          module_id?: string
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_shares_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string | null
          final_score: number | null
          id: string
          status: string | null
          topic: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          final_score?: number | null
          id?: string
          status?: string | null
          topic: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          final_score?: number | null
          id?: string
          status?: string | null
          topic?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          attempt_type: string | null
          created_at: string | null
          id: string
          module_id: string
          score: number
          total_questions: number
        }
        Insert: {
          attempt_type?: string | null
          created_at?: string | null
          id?: string
          module_id: string
          score: number
          total_questions: number
        }
        Update: {
          attempt_type?: string | null
          created_at?: string | null
          id?: string
          module_id?: string
          score?: number
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      reply_upvotes: {
        Row: {
          created_at: string
          id: string
          reply_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reply_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reply_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_upvotes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_upvotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string | null
          id: string
          module_id: string
          resource_type: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id: string
          resource_type?: string | null
          title: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string
          resource_type?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      content_quality_metrics: {
        Row: {
          approval_count: number | null
          average_rating: number | null
          content_id: string | null
          content_status: Database["public"]["Enums"]["content_status"] | null
          content_type: string | null
          created_at: string | null
          flag_count: number | null
          last_rated_at: string | null
          module_id: string | null
          module_topic: string | null
          recent_feedback: string | null
          review_count: number | null
          total_ratings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_module_member: {
        Args: { module_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "instructor" | "user"
      content_status: "draft" | "pending_review" | "approved" | "flagged"
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
      app_role: ["admin", "instructor", "user"],
      content_status: ["draft", "pending_review", "approved", "flagged"],
    },
  },
} as const
