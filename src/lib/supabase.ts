import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      evolution_api_settings: {
        Row: {
          id: string;
          api_url: string;
          api_key: string;
          is_active: boolean;
          connection_status: 'connected' | 'disconnected' | 'error';
          last_tested_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          api_url: string;
          api_key: string;
          is_active?: boolean;
          connection_status?: 'connected' | 'disconnected' | 'error';
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          api_url?: string;
          api_key?: string;
          is_active?: boolean;
          connection_status?: 'connected' | 'disconnected' | 'error';
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      whatsapp_instances: {
        Row: {
          id: string;
          instance_name: string;
          instance_id: string | null;
          status: 'connecting' | 'connected' | 'disconnected' | 'error';
          qr_code: string | null;
          webhook_url: string | null;
          phone_number: string | null;
          profile_name: string | null;
          profile_pic_url: string | null;
          owner_jid: string | null;
          connection_status: 'open' | 'close' | 'connecting';
          token: string | null;
          evolution_instance_id: string | null;
          last_sync_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          instance_name: string;
          instance_id?: string | null;
          status?: 'connecting' | 'connected' | 'disconnected' | 'error';
          qr_code?: string | null;
          webhook_url?: string | null;
          phone_number?: string | null;
          profile_name?: string | null;
          profile_pic_url?: string | null;
          owner_jid?: string | null;
          connection_status?: 'open' | 'close' | 'connecting';
          token?: string | null;
          evolution_instance_id?: string | null;
          last_sync_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          instance_name?: string;
          instance_id?: string | null;
          status?: 'connecting' | 'connected' | 'disconnected' | 'error';
          qr_code?: string | null;
          webhook_url?: string | null;
          phone_number?: string | null;
          profile_name?: string | null;
          profile_pic_url?: string | null;
          owner_jid?: string | null;
          connection_status?: 'open' | 'close' | 'connecting';
          token?: string | null;
          evolution_instance_id?: string | null;
          last_sync_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          phone_number: string;
          name: string | null;
          profile_picture: string | null;
          instance_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone_number: string;
          name?: string | null;
          profile_picture?: string | null;
          instance_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone_number?: string;
          name?: string | null;
          profile_picture?: string | null;
          instance_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          contact_id: string;
          instance_id: string;
          status: 'active' | 'closed' | 'waiting';
          last_message_at: string;
          unread_count: number;
          tags: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          instance_id: string;
          status?: 'active' | 'closed' | 'waiting';
          last_message_at?: string;
          unread_count?: number;
          tags?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          instance_id?: string;
          status?: 'active' | 'closed' | 'waiting';
          last_message_at?: string;
          unread_count?: number;
          tags?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          instance_id: string;
          message_id: string | null;
          sender_phone: string;
          recipient_phone: string;
          message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
          content: string | null;
          media_url: string | null;
          is_from_me: boolean;
          timestamp: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          instance_id: string;
          message_id?: string | null;
          sender_phone: string;
          recipient_phone: string;
          message_type?: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
          content?: string | null;
          media_url?: string | null;
          is_from_me?: boolean;
          timestamp?: string;
          status?: 'sent' | 'delivered' | 'read' | 'failed';
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          instance_id?: string;
          message_id?: string | null;
          sender_phone?: string;
          recipient_phone?: string;
          message_type?: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
          content?: string | null;
          media_url?: string | null;
          is_from_me?: boolean;
          timestamp?: string;
          status?: 'sent' | 'delivered' | 'read' | 'failed';
          created_at?: string;
        };
      };
    };
  };
};