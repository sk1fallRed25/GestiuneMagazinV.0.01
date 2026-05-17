import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Lipsesc cheile Supabase din fișierul .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

if (typeof window !== 'undefined') {
    (window as any).supabase = supabase;
}