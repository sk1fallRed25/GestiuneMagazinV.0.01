import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iwlmlhhjzqnwlfoittot.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bG1saGhqenFud2xmb2l0dG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTI4NDQsImV4cCI6MjA4MTQ2ODg0NH0.pXVaMZ6WNCzxo8JDbPPgc-tgNhTi_FCY_8s7J5RIsIw' // <--- Aceeași cheie

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

if (typeof window !== 'undefined') {
    (window as any).supabase = supabase;
}