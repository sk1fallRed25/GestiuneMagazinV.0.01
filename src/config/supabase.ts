import { createClient } from '@supabase/supabase-js';

// @ts-ignore - Vite va înlocui aceste variabile la build
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore - Vite va înlocui aceste variabile la build
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificare de siguranță
if (!supabaseUrl || !supabaseKey) {
    console.error('Lipsesc variabilele de mediu VITE_SUPABASE_URL sau VITE_SUPABASE_ANON_KEY din fișierul .env');
}

// Creăm clientul Supabase (pe web folosește automat localStorage, nu e nevoie de configurare extra)
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');