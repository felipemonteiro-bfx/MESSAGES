/**
 * Tipos TypeScript para o sistema de mensagens
 */

export interface User {
  id: string;
  email?: string;
  nickname?: string;
  avatar_url?: string;
  full_name?: string;
  created_at?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  chat_id: string;
  content: string;
  created_at: string;
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'audio' | null;
  read_at?: string | null;
  expires_at?: string | null;
  is_ephemeral?: boolean;
  reply_to_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  deleted_for_everyone?: boolean;
  original_content?: string | null;
  is_view_once?: boolean;
  viewed_at?: string | null;
  reactions?: Record<string, MessageReaction>;
  is_encrypted?: boolean;
  signature?: string | null;
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  name?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ChatParticipant {
  chat_id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string | null;
}

export interface ChatWithRecipient extends Chat {
  recipient?: {
    id: string;
    nickname: string;
    avatar_url: string;
    public_key?: string | null;
  };
  lastMessage?: string;
  time?: string;
}

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string;
  full_name?: string;
  is_premium?: boolean;
  created_at: string;
  public_key?: string | null;
}
