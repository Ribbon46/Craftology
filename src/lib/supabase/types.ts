export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          rating: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          rating?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          rating?: number | null;
          created_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          title: string;
          description: string;
          price: number;
          category: string;
          image_urls: string[];
          seller_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          price: number;
          category: string;
          image_urls?: string[];
          seller_id: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          price?: number;
          category?: string;
          image_urls?: string[];
          seller_id?: string;
          status?: string;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          listing_id: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          listing_id: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          seller_id?: string;
          listing_id?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          text: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          text: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          text?: string;
          read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_: string]: unknown;
    };
    Functions: {
      [_: string]: unknown;
    };
    Enums: {
      [_: string]: unknown;
    };
  };
}