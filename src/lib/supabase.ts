import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase (tylko public klucz)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin client - tylko dla API routes
function createAdminClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Tylko w server environment
export const supabaseAdmin = typeof window === 'undefined' 
  ? createAdminClient()
  : null as any

// Database types
export interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
}

export interface Link {
  id: string
  user_id: string
  original_url: string
  short_code: string
  title?: string
  clicks: number
  created_at: string
  updated_at: string
}

export interface LinkClick {
  id: string
  link_id: string
  clicked_at: string
  country?: string
  city?: string
  device_type?: string
  browser?: string
  os?: string
  referrer?: string
  ip_address?: string
}

export interface MonthlyUsage {
  id: string
  user_id: string
  year: number
  month: number
  links_created: number
  total_clicks: number
  created_at: string
  updated_at: string
}