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
      campaigns: {
        Row: {
          id: string
          title: string
          type: 'evergreen' | 'fixed'
          user_id: string | null
          duration_minutes: number | null
          fixed_deadline: string | null
          target_urls: string[]
          expiration_action: Json
          styles: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          type: 'evergreen' | 'fixed'
          user_id?: string | null
          duration_minutes?: number | null
          fixed_deadline?: string | null
          target_urls?: string[]
          expiration_action?: Json
          styles?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          type?: 'evergreen' | 'fixed'
          user_id?: string | null
          duration_minutes?: number | null
          fixed_deadline?: string | null
          target_urls?: string[]
          expiration_action?: Json
          styles?: Json
          created_at?: string
          updated_at?: string
        }
      }
      visitors: {
        Row: {
          id: string
          visitor_id: string
          ip_address: string
          fingerprint: string | null
          deadline: string
          campaign_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          visitor_id: string
          ip_address: string
          fingerprint?: string | null
          deadline: string
          campaign_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          visitor_id?: string
          ip_address?: string
          fingerprint?: string | null
          deadline?: string
          campaign_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}