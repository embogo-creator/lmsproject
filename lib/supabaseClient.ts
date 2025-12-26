// lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr'

// These logs will help us see if your keys are working in the terminal
console.log('ENV URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT LOADED')
console.log('ENV KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'LOADED' : 'NOT LOADED')

// 1. This is the "Factory"
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 2. This "builds the car" so the Dashboard can use it immediately
export const supabase = createClient()