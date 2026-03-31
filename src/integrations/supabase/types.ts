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
      font_dataset: {
        Row: {
          created_at: string
          font_name: string
          id: string
          metadata_json: Json | null
          sample_image_url: string
          verified_by_admin: boolean | null
          visual_hash: string | null
        }
        Insert: {
          created_at?: string
          font_name: string
          id?: string
          metadata_json?: Json | null
          sample_image_url: string
          verified_by_admin?: boolean | null
          visual_hash?: string | null
        }
        Update: {
          created_at?: string
          font_name?: string
          id?: string
          metadata_json?: Json | null
          sample_image_url?: string
          verified_by_admin?: boolean | null
          visual_hash?: string | null
        }
        Relationships: []
      }
      font_files: {
        Row: {
          created_at: string
          file_url: string
          font_id: string
          id: string
          weight: string
        }
        Insert: {
          created_at?: string
          file_url: string
          font_id: string
          id?: string
          weight?: string
        }
        Update: {
          created_at?: string
          file_url?: string
          font_id?: string
          id?: string
          weight?: string
        }
        Relationships: [
          {
            foreignKeyName: "font_files_font_id_fkey"
            columns: ["font_id"]
            isOneToOne: false
            referencedRelation: "fonts_library"
            referencedColumns: ["id"]
          },
        ]
      }
      fonts: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          license: string | null
          name: string
          name_ar: string
          preview_image_url: string | null
          style: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          license?: string | null
          name: string
          name_ar: string
          preview_image_url?: string | null
          style?: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          license?: string | null
          name?: string
          name_ar?: string
          preview_image_url?: string | null
          style?: string
        }
        Relationships: []
      }
      fonts_library: {
        Row: {
          category: string
          created_at: string
          download_url: string | null
          font_name: string
          font_name_ar: string
          id: string
          license: string | null
          preview_image_url: string | null
          reference_image_url: string | null
          style: string
          tags: string[] | null
          visual_features_hash: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          download_url?: string | null
          font_name: string
          font_name_ar: string
          id?: string
          license?: string | null
          preview_image_url?: string | null
          reference_image_url?: string | null
          style?: string
          tags?: string[] | null
          visual_features_hash?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          download_url?: string | null
          font_name?: string
          font_name_ar?: string
          id?: string
          license?: string | null
          preview_image_url?: string | null
          reference_image_url?: string | null
          style?: string
          tags?: string[] | null
          visual_features_hash?: string | null
        }
        Relationships: []
      }
      manual_identification_queue: {
        Row: {
          admin_download_url: string | null
          assigned_font_id: string | null
          assigned_font_name: string | null
          created_at: string
          id: string
          is_notified: boolean | null
          needs_correction: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_confirmation: boolean | null
          user_id: string | null
          user_uploaded_image: string
        }
        Insert: {
          admin_download_url?: string | null
          assigned_font_id?: string | null
          assigned_font_name?: string | null
          created_at?: string
          id?: string
          is_notified?: boolean | null
          needs_correction?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_confirmation?: boolean | null
          user_id?: string | null
          user_uploaded_image: string
        }
        Update: {
          admin_download_url?: string | null
          assigned_font_id?: string | null
          assigned_font_name?: string | null
          created_at?: string
          id?: string
          is_notified?: boolean | null
          needs_correction?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_confirmation?: boolean | null
          user_id?: string | null
          user_uploaded_image?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_identification_queue_assigned_font_id_fkey"
            columns: ["assigned_font_id"]
            isOneToOne: false
            referencedRelation: "fonts_library"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          id: string
          visited_at: string
          visitor_id: string | null
        }
        Insert: {
          id?: string
          visited_at?: string
          visitor_id?: string | null
        }
        Update: {
          id?: string
          visited_at?: string
          visitor_id?: string | null
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
