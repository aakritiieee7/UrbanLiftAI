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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      carrier_profiles: {
        Row: {
          auth_email: string | null
          business_model: string | null
          business_name: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          gstin: string | null
          insurance_number: string | null
          licenses: string | null
          phone: string | null
          role: string
          service_areas: string[] | null
          service_regions: string | null
          specialties: string | null
          state: string | null
          updated_at: string
          user_id: string
          username: string | null
          vehicle_capacity_kg: number | null
          vehicle_type: string | null
          vehicle_types: string | null
          website: string | null
          years_experience: number | null
          zip_code: string | null
        }
        Insert: {
          auth_email?: string | null
          business_model?: string | null
          business_name?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          insurance_number?: string | null
          licenses?: string | null
          phone?: string | null
          role?: string
          service_areas?: string[] | null
          service_regions?: string | null
          specialties?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          vehicle_capacity_kg?: number | null
          vehicle_type?: string | null
          vehicle_types?: string | null
          website?: string | null
          years_experience?: number | null
          zip_code?: string | null
        }
        Update: {
          auth_email?: string | null
          business_model?: string | null
          business_name?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          insurance_number?: string | null
          licenses?: string | null
          phone?: string | null
          role?: string
          service_areas?: string[] | null
          service_regions?: string | null
          specialties?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          vehicle_capacity_kg?: number | null
          vehicle_type?: string | null
          vehicle_types?: string | null
          website?: string | null
          years_experience?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chatroom_id: string
          created_at: string
          id: string
          message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chatroom_id: string
          created_at?: string
          id?: string
          message: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chatroom_id?: string
          created_at?: string
          id?: string
          message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chatroom_id_fkey"
            columns: ["chatroom_id"]
            isOneToOne: false
            referencedRelation: "chatrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chatrooms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          content: string
          created_at: string
          forum_type: string
          id: string
          image_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          forum_type: string
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          forum_type?: string
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          shipment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      points_balances: {
        Row: {
          created_at: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          capacity_kg: number
          carrier_id: string | null
          created_at: string
          destination: string
          destination_address: string | null
          destination_lat: number | null
          destination_lng: number | null
          distance_km: number | null
          dropoff_time: string | null
          id: string
          origin: string
          origin_address: string | null
          origin_lat: number | null
          origin_lng: number | null
          payment_amount: number | null
          payment_id: string | null
          payment_status: string | null
          pickup_time: string | null
          pooled: boolean
          shipper_id: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity_kg: number
          carrier_id?: string | null
          created_at?: string
          destination: string
          destination_address?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          dropoff_time?: string | null
          id?: string
          origin: string
          origin_address?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          payment_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          pickup_time?: string | null
          pooled?: boolean
          shipper_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity_kg?: number
          carrier_id?: string | null
          created_at?: string
          destination?: string
          destination_address?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          dropoff_time?: string | null
          id?: string
          origin?: string
          origin_address?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          payment_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          pickup_time?: string | null
          pooled?: boolean
          shipper_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipper_profiles: {
        Row: {
          address: string | null
          auth_email: string | null
          business_model: string | null
          business_name: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          gstin: string | null
          phone: string | null
          role: string
          specialties: string | null
          state: string | null
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          auth_email?: string | null
          business_model?: string | null
          business_name?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          phone?: string | null
          role: string
          specialties?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          auth_email?: string | null
          business_model?: string | null
          business_name?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          phone?: string | null
          role?: string
          specialties?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: { _points: number; _source: string; _user_id: string }
        Returns: undefined
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: string
      }
      mark_pooled_and_delivered: {
        Args: { _carrier_id: string; _shipment_ids: string[] }
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
