// Generated from the live Supabase schema (project: countme / akfgudspliyymiysajoh).
// Do not edit by hand. Regenerate via the Supabase MCP `generate_typescript_types`
// or: npx supabase gen types typescript --project-id akfgudspliyymiysajoh
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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          recognition_percentage: number
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          recognition_percentage?: number
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          recognition_percentage?: number
          user_id?: string
        }
        Relationships: []
      }
      income_documents: {
        Row: {
          amount: number
          client_name: string | null
          created_at: string
          date: string
          description: string | null
          doc_number: number
          doc_type: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          client_name?: string | null
          created_at?: string
          date?: string
          description?: string | null
          doc_number: number
          doc_type: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_name?: string | null
          created_at?: string
          date?: string
          description?: string | null
          doc_number?: number
          doc_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          income_date: string
          payment_method: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          income_date?: string
          payment_method: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          income_date?: string
          payment_method?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_sends: {
        Row: {
          created_at: string
          id: string
          income_id: string
          recipient_email: string
          sent_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          income_id: string
          recipient_email: string
          sent_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          income_id?: string
          recipient_email?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sends_income_id_fkey"
            columns: ["income_id"]
            isOneToOne: false
            referencedRelation: "incomes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_email: string
          client_name: string
          created_at: string
          date: string
          description: string
          id: string
          invoice_number: number
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          client_email: string
          client_name: string
          created_at?: string
          date: string
          description: string
          id?: string
          invoice_number: number
          notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_email?: string
          client_name?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          invoice_number?: number
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          chat_history: Json | null
          created_at: string
          deductions_summary: Json | null
          email: string
          first_name: string
          id: string
          is_registration_complete: boolean
          last_name: string
          persona: Json | null
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          chat_history?: Json | null
          created_at?: string
          deductions_summary?: Json | null
          email?: string
          first_name?: string
          id?: string
          is_registration_complete?: boolean
          last_name?: string
          persona?: Json | null
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          chat_history?: Json | null
          created_at?: string
          deductions_summary?: Json | null
          email?: string
          first_name?: string
          id?: string
          is_registration_complete?: boolean
          last_name?: string
          persona?: Json | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      tax_rules: {
        Row: {
          description: string | null
          id: string
          rule_type: string
          updated_at: string
          valid_from: string
          value_num: number | null
          value_text: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          rule_type: string
          updated_at?: string
          valid_from?: string
          value_num?: number | null
          value_text?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          rule_type?: string
          updated_at?: string
          valid_from?: string
          value_num?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          name_he: string
          description_he: string | null
          price_agorot: number
          billing_interval: string
          provider: string | null
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id: string
          name_he: string
          description_he?: string | null
          price_agorot?: number
          billing_interval?: string
          provider?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name_he?: string
          description_he?: string | null
          price_agorot?: number
          billing_interval?: string
          provider?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: string
          current_period_end: string | null
          cancel_at_period_end: boolean
          psp: string | null
          psp_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          psp?: string | null
          psp_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          status?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          psp?: string | null
          psp_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          amount_agorot: number
          currency: string
          status: string
          psp: string | null
          psp_transaction_id: string | null
          tax_invoice_number: string | null
          tax_invoice_url: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          amount_agorot: number
          currency?: string
          status?: string
          psp?: string | null
          psp_transaction_id?: string | null
          tax_invoice_number?: string | null
          tax_invoice_url?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          amount_agorot?: number
          currency?: string
          status?: string
          psp?: string | null
          psp_transaction_id?: string | null
          tax_invoice_number?: string | null
          tax_invoice_url?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          id: string
          user_id: string | null
          name: string
          props: Json
          path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          props?: Json
          path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          props?: Json
          path?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_doc_number: { Args: { p_user_id: string }; Returns: number }
      get_next_invoice_number: { Args: { p_user_id: string }; Returns: number }
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
