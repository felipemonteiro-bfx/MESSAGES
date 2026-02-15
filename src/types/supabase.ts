export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nickname: string
          avatar_url: string
          full_name: string | null
          is_premium: boolean
          created_at: string
          public_key: string | null
        }
        Insert: {
          id: string
          nickname: string
          avatar_url?: string
          full_name?: string | null
          is_premium?: boolean
          created_at?: string
          public_key?: string | null
        }
        Update: {
          id?: string
          nickname?: string
          avatar_url?: string
          full_name?: string | null
          is_premium?: boolean
          created_at?: string
          public_key?: string | null
        }
      }
      chats: {
        Row: {
          id: string
          type: 'private' | 'group'
          name: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          type?: 'private' | 'group'
          name?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          type?: 'private' | 'group'
          name?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      chat_participants: {
        Row: {
          chat_id: string
          user_id: string
          joined_at: string
          last_read_at: string | null
        }
        Insert: {
          chat_id: string
          user_id: string
          joined_at?: string
          last_read_at?: string | null
        }
        Update: {
          chat_id?: string
          user_id?: string
          joined_at?: string
          last_read_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          chat_id: string
          content: string
          created_at: string
          media_url: string | null
          media_type: 'image' | 'video' | 'audio' | null
          read_at: string | null
          expires_at: string | null
          is_ephemeral: boolean
        }
        Insert: {
          id?: string
          sender_id: string
          chat_id: string
          content: string
          created_at?: string
          media_url?: string | null
          media_type?: 'image' | 'video' | 'audio' | null
          read_at?: string | null
          expires_at?: string | null
          is_ephemeral?: boolean
        }
        Update: {
          id?: string
          sender_id?: string
          chat_id?: string
          content?: string
          created_at?: string
          media_url?: string | null
          media_type?: 'image' | 'video' | 'audio' | null
          read_at?: string | null
          expires_at?: string | null
          is_ephemeral?: boolean
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          subscription_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_json: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_json?: Json
          created_at?: string
        }
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
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Chat = Database['public']['Tables']['chats']['Row']
export type ChatParticipant = Database['public']['Tables']['chat_participants']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
