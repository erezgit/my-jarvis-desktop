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
      signup_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          status: string
          used_at: string | null
          user_id: string | null
          waiting_list_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string
          used_at?: string | null
          user_id?: string | null
          waiting_list_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string
          used_at?: string | null
          user_id?: string | null
          waiting_list_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_codes_waiting_list_id_fkey"
            columns: ["waiting_list_id"]
            isOneToOne: false
            referencedRelation: "waiting_list"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage_daily: {
        Row: {
          created_at: string
          daily_cache_creation_tokens: number
          daily_cache_read_tokens: number
          daily_cost_usd: number
          daily_input_tokens: number
          daily_message_count: number
          daily_output_tokens: number
          daily_session_count: number
          daily_thinking_tokens: number
          daily_total_tokens: number | null
          id: string
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_cache_creation_tokens?: number
          daily_cache_read_tokens?: number
          daily_cost_usd?: number
          daily_input_tokens?: number
          daily_message_count?: number
          daily_output_tokens?: number
          daily_session_count?: number
          daily_thinking_tokens?: number
          daily_total_tokens?: number | null
          id?: string
          updated_at?: string
          usage_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_cache_creation_tokens?: number
          daily_cache_read_tokens?: number
          daily_cost_usd?: number
          daily_input_tokens?: number
          daily_message_count?: number
          daily_output_tokens?: number
          daily_session_count?: number
          daily_thinking_tokens?: number
          daily_total_tokens?: number | null
          id?: string
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      token_usage_sessions: {
        Row: {
          cache_creation_tokens: number
          cache_read_tokens: number
          estimated_cost_usd: number
          id: string
          input_tokens: number
          last_updated_at: string
          message_count: number
          model_used: string | null
          output_tokens: number
          session_id: string
          session_started_at: string
          thinking_tokens: number
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          cache_creation_tokens?: number
          cache_read_tokens?: number
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          last_updated_at?: string
          message_count?: number
          model_used?: string | null
          output_tokens?: number
          session_id: string
          session_started_at: string
          thinking_tokens?: number
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          cache_creation_tokens?: number
          cache_read_tokens?: number
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          last_updated_at?: string
          message_count?: number
          model_used?: string | null
          output_tokens?: number
          session_id?: string
          session_started_at?: string
          thinking_tokens?: number
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_instances: {
        Row: {
          created_at: string | null
          fly_app_name: string
          fly_app_url: string
          id: string
          last_accessed: string | null
          provisioned_at: string | null
          status: string
          user_id: string | null
          waiting_list_id: string | null
        }
        Insert: {
          created_at?: string | null
          fly_app_name: string
          fly_app_url: string
          id?: string
          last_accessed?: string | null
          provisioned_at?: string | null
          status: string
          user_id?: string | null
          waiting_list_id?: string | null
        }
        Update: {
          created_at?: string | null
          fly_app_name?: string
          fly_app_url?: string
          id?: string
          last_accessed?: string | null
          provisioned_at?: string | null
          status?: string
          user_id?: string | null
          waiting_list_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_instances_waiting_list_id_fkey"
            columns: ["waiting_list_id"]
            isOneToOne: false
            referencedRelation: "waiting_list"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_list: {
        Row: {
          about: string | null
          email: string
          id: string
          name: string
          notes: string | null
          signup_date: string | null
          status: string
        }
        Insert: {
          about?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          signup_date?: string | null
          status?: string
        }
        Update: {
          about?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          signup_date?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      upsert_token_usage: {
        Args: { daily_data: Json; session_data: Json }
        Returns: undefined
      }
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