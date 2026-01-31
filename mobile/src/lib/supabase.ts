import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 1. URL-ul tău Supabase (l-am completat deja cu ce mi-ai dat)
const supabaseUrl = 'https://iwlmlhhjzqnwlfoittot.supabase.co';

// 2. Cheia ANON (Publică)
// ⚠️ IMPORTANT: Înlocuiește 'AICI_PUI_CHEIA_TA_ANON_PUBLIC' cu șirul lung care începe cu "eyJh..."
// Nu folosi process.env aici direct decât dacă ai configurat babel-plugin-dotenv,
// altfel va fi undefined pe telefon.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bG1saGhqenFud2xmb2l0dG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTI4NDQsImV4cCI6MjA4MTQ2ODg0NH0.pXVaMZ6WNCzxo8JDbPPgc-tgNhTi_FCY_8s7J5RIsIw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage, // Asta e cheia pentru mobil!
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});