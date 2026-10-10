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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_withdrawals: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          id: string
          note: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          id?: string
          note?: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: []
      }
      backlog_tasks: {
        Row: {
          author: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          priority: string
          sort_order: number
          source: string
          status: string
          title: string
        }
        Insert: {
          author?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          priority?: string
          sort_order?: number
          source?: string
          status?: string
          title: string
        }
        Update: {
          author?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          priority?: string
          sort_order?: number
          source?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string
          link_url: string
          published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          link_url?: string
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          link_url?: string
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      computer_games: {
        Row: {
          computer_id: string
          game_id: string
        }
        Insert: {
          computer_id: string
          game_id: string
        }
        Update: {
          computer_id?: string
          game_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "computer_games_computer_id_fkey"
            columns: ["computer_id"]
            isOneToOne: false
            referencedRelation: "computers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "computer_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      computer_links: {
        Row: {
          computer_id: string
          rent_url: string
        }
        Insert: {
          computer_id: string
          rent_url?: string
        }
        Update: {
          computer_id?: string
          rent_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "computer_links_computer_id_fkey"
            columns: ["computer_id"]
            isOneToOne: true
            referencedRelation: "computers"
            referencedColumns: ["id"]
          },
        ]
      }
      computers: {
        Row: {
          available: boolean
          blocked: boolean
          city: string
          cpu: string
          created_at: string
          gpu: string
          id: string
          name: string
          price: number
          ram_gb: number
        }
        Insert: {
          available?: boolean
          blocked?: boolean
          city?: string
          cpu?: string
          created_at?: string
          gpu?: string
          id?: string
          name: string
          price?: number
          ram_gb?: number
        }
        Update: {
          available?: boolean
          blocked?: boolean
          city?: string
          cpu?: string
          created_at?: string
          gpu?: string
          id?: string
          name?: string
          price?: number
          ram_gb?: number
        }
        Relationships: []
      }
      game_accounts: {
        Row: {
          created_at: string
          game_id: string
          id: string
          login: string
          note: string
          password: string
          price: number
          sold_at: string | null
          sold_to: string | null
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          login: string
          note?: string
          password: string
          price: number
          sold_at?: string | null
          sold_to?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          login?: string
          note?: string
          password?: string
          price?: number
          sold_at?: string | null
          sold_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_accounts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          about: string
          category_id: string | null
          cloud_saves: boolean
          created_at: string
          developer: string
          discount_percent: number
          id: string
          image_url: string | null
          label: string | null
          price: number
          published: boolean
          requirements_min: string
          requirements_rec: string
          slug: string
          steam_appid: number | null
          title: string
          year: number | null
        }
        Insert: {
          about?: string
          category_id?: string | null
          cloud_saves?: boolean
          created_at?: string
          developer?: string
          discount_percent?: number
          id?: string
          image_url?: string | null
          label?: string | null
          price?: number
          published?: boolean
          requirements_min?: string
          requirements_rec?: string
          slug: string
          steam_appid?: number | null
          title: string
          year?: number | null
        }
        Update: {
          about?: string
          category_id?: string | null
          cloud_saves?: boolean
          created_at?: string
          developer?: string
          discount_percent?: number
          id?: string
          image_url?: string | null
          label?: string | null
          price?: number
          published?: boolean
          requirements_min?: string
          requirements_rec?: string
          slug?: string
          steam_appid?: number | null
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string
          balance: number
          bio: string
          blocked: boolean
          created_at: string
          display_name: string
          email: string
          favorite_genres: string[]
          id: string
        }
        Insert: {
          avatar_url?: string
          balance?: number
          bio?: string
          blocked?: boolean
          created_at?: string
          display_name?: string
          email?: string
          favorite_genres?: string[]
          id: string
        }
        Update: {
          avatar_url?: string
          balance?: number
          bio?: string
          blocked?: boolean
          created_at?: string
          display_name?: string
          email?: string
          favorite_genres?: string[]
          id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          max_uses: number | null
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          uses_count?: number
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          consumed_at: string | null
          discount_percent: number
          id: string
          promo_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          discount_percent: number
          id?: string
          promo_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          discount_percent?: number
          id?: string
          promo_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_sessions: {
        Row: {
          computer_id: string | null
          computer_name: string
          ended_at: string | null
          id: string
          paid_until: string
          price_per_hour: number
          started_at: string
          total_charged: number
          user_id: string
        }
        Insert: {
          computer_id?: string | null
          computer_name?: string
          ended_at?: string | null
          id?: string
          paid_until: string
          price_per_hour: number
          started_at?: string
          total_charged?: number
          user_id: string
        }
        Update: {
          computer_id?: string | null
          computer_name?: string
          ended_at?: string | null
          id?: string
          paid_until?: string
          price_per_hour?: number
          started_at?: string
          total_charged?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_sessions_computer_id_fkey"
            columns: ["computer_id"]
            isOneToOne: false
            referencedRelation: "computers"
            referencedColumns: ["id"]
          },
        ]
      }
      site_links: {
        Row: {
          content: string
          created_at: string
          id: string
          label: string
          placement: string
          published: boolean
          sort_order: number
          url: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          label: string
          placement: string
          published?: boolean
          sort_order?: number
          url?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          label?: string
          placement?: string
          published?: boolean
          sort_order?: number
          url?: string
        }
        Relationships: []
      }
      site_presence: {
        Row: {
          last_seen: string
          path: string
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          last_seen?: string
          path?: string
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          last_seen?: string
          path?: string
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      steam_links: {
        Row: {
          avatar_url: string
          games: Json
          persona: string
          steam_id: string
          top_genres: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string
          games?: Json
          persona?: string
          steam_id: string
          top_genres?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string
          games?: Json
          persona?: string
          steam_id?: string
          top_genres?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          from_support: boolean
          id: string
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_support?: boolean
          id?: string
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_support?: boolean
          id?: string
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          description: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      admin_set_blocked: {
        Args: { _blocked: boolean; _user_id: string }
        Returns: undefined
      }
      admin_settle_all: { Args: never; Returns: undefined }
      buy_game_account: { Args: { _game_id: string }; Returns: string }
      consume_active_promo: { Args: { _uid: string }; Returns: number }
      end_rental: { Args: { _session_id: string }; Returns: undefined }
      game_account_offer: {
        Args: { _game_id: string }
        Returns: {
          available: number
          price: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_active_promo: {
        Args: never
        Returns: {
          code: string
          discount_percent: number
        }[]
      }
      my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          balance: number
          bio: string
          blocked: boolean
          created_at: string
          display_name: string
          email: string
          favorite_genres: string[]
          id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ping_presence: {
        Args: { _path: string; _visitor_id: string }
        Returns: undefined
      }
      redeem_promo: { Args: { _code: string }; Returns: number }
      session_url: { Args: { _session_id: string }; Returns: string }
      settle_user: { Args: { _uid: string }; Returns: undefined }
      start_rental: { Args: { _computer_id: string }; Returns: string }
      start_rental_prepaid: {
        Args: { _computer_id: string; _game_id: string; _hours: number }
        Returns: string
      }
      update_my_profile: {
        Args: {
          _avatar_url: string
          _bio: string
          _display_name: string
          _favorite_genres: string[]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    },
  },
} as const
