// lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// This logic prevents the "Failed to fetch" crash by validating keys first
export const createClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase keys are missing! Check your .env.local file.')
    // Return a dummy object or handle gracefully to prevent "Failed to fetch"
    return null as any 
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createClient()