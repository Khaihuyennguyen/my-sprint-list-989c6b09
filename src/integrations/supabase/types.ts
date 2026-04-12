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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      coding_problems: {
        Row: {
          boilerplate_python: string | null
          boilerplate_sql: string | null
          created_at: string
          description: string
          difficulty: string
          id: string
          is_active: boolean
          solution: string | null
          test_cases: Json
          title: string
          track: string
        }
        Insert: {
          boilerplate_python?: string | null
          boilerplate_sql?: string | null
          created_at?: string
          description: string
          difficulty: string
          id?: string
          is_active?: boolean
          solution?: string | null
          test_cases?: Json
          title: string
          track: string
        }
        Update: {
          boilerplate_python?: string | null
          boilerplate_sql?: string | null
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          solution?: string | null
          test_cases?: Json
          title?: string
          track?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string
          difficulty: string
          expected_answer: string | null
          id: string
          is_active: boolean
          question_text: string
          track: string
        }
        Insert: {
          created_at?: string
          difficulty: string
          expected_answer?: string | null
          id?: string
          is_active?: boolean
          question_text: string
          track: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          expected_answer?: string | null
          id?: string
          is_active?: boolean
          question_text?: string
          track?: string
        }
        Relationships: []
      }
      session_questions: {
        Row: {
          feedback_text: string | null
          id: string
          question_index: number
          question_text: string
          scores_clarity: number | null
          scores_completeness: number | null
          scores_structure: number | null
          session_id: string
          transcript: string | null
        }
        Insert: {
          feedback_text?: string | null
          id?: string
          question_index: number
          question_text: string
          scores_clarity?: number | null
          scores_completeness?: number | null
          scores_structure?: number | null
          session_id: string
          transcript?: string | null
        }
        Update: {
          feedback_text?: string | null
          id?: string
          question_index?: number
          question_text?: string
          scores_clarity?: number | null
          scores_completeness?: number | null
          scores_structure?: number | null
          session_id?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          avg_clarity: number
          avg_completeness: number
          avg_structure: number
          created_at: string
          difficulty: string
          id: string
          overall_score: number
          track: string
          user_id: string
        }
        Insert: {
          avg_clarity?: number
          avg_completeness?: number
          avg_structure?: number
          created_at?: string
          difficulty: string
          id?: string
          overall_score?: number
          track: string
          user_id: string
        }
        Update: {
          avg_clarity?: number
          avg_completeness?: number
          avg_structure?: number
          created_at?: string
          difficulty?: string
          id?: string
          overall_score?: number
          track?: string
          user_id?: string
        }
        Relationships: []
      }
      shadow_results: {
        Row: {
          created_at: string
          expected_text: string
          feedback_text: string | null
          id: string
          overall_score: number | null
          scores_accent_clarity: number | null
          scores_confidence: number | null
          scores_connected_speech: number | null
          scores_fluency: number | null
          scores_intonation: number | null
          scores_pronunciation: number | null
          segment_index: number
          session_id: string
          user_transcript: string | null
        }
        Insert: {
          created_at?: string
          expected_text: string
          feedback_text?: string | null
          id?: string
          overall_score?: number | null
          scores_accent_clarity?: number | null
          scores_confidence?: number | null
          scores_connected_speech?: number | null
          scores_fluency?: number | null
          scores_intonation?: number | null
          scores_pronunciation?: number | null
          segment_index: number
          session_id: string
          user_transcript?: string | null
        }
        Update: {
          created_at?: string
          expected_text?: string
          feedback_text?: string | null
          id?: string
          overall_score?: number | null
          scores_accent_clarity?: number | null
          scores_confidence?: number | null
          scores_connected_speech?: number | null
          scores_fluency?: number | null
          scores_intonation?: number | null
          scores_pronunciation?: number | null
          segment_index?: number
          session_id?: string
          user_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shadow_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "shadow_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shadow_sessions: {
        Row: {
          created_at: string
          id: string
          roles: Json
          selected_role: string | null
          status: string
          transcript: string
          user_id: string
          video_title: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          roles?: Json
          selected_role?: string | null
          status?: string
          transcript?: string
          user_id: string
          video_title?: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          id?: string
          roles?: Json
          selected_role?: string | null
          status?: string
          transcript?: string
          user_id?: string
          video_title?: string
          youtube_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
