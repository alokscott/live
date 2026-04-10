import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
    )
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export type Database = {
  public: {
    Tables: {
      deposits: {
        Row: {
          id: string
          user_id: string
          amount: number
          deposit_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          deposit_date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          deposit_date?: string
          created_at?: string
        }
      }
      closures: {
        Row: {
          id: string
          deposit_id: string
          user_id: string
          principal: number
          interest_redeemed: number
          total_payout: number
          weeks_elapsed: number
          closure_date: string
          created_at: string
        }
        Insert: {
          id?: string
          deposit_id: string
          user_id: string
          principal: number
          interest_redeemed: number
          total_payout: number
          weeks_elapsed: number
          closure_date: string
          created_at?: string
        }
        Update: {
          id?: string
          deposit_id?: string
          user_id?: string
          principal?: number
          interest_redeemed?: number
          total_payout?: number
          weeks_elapsed?: number
          closure_date?: string
          created_at?: string
        }
      }
    }
  }
}

export type Deposit = Database['public']['Tables']['deposits']['Row']
export type Closure = Database['public']['Tables']['closures']['Row']
