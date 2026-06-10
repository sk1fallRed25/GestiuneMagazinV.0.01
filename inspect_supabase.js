import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iwlmlhhjzqnwlfoittot.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bG1saGhqenFud2xmb2l0dG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTI4NDQsImV4cCI6MjA4MTQ2ODg0NH0.pXVaMZ6WNCzxo8JDbPPgc-tgNhTi_FCY_8s7J5RIsIw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        console.log("Signing in...");
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'admin@admin.com',
            password: 'admin123'
        });
        if (authError) throw authError;

        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, barcode, category_id, status, store_id');
        if (prodError) throw prodError;

        console.log(`Total Products: ${products.length}`);
        
        const withCat = products.filter(p => p.category_id !== null);
        console.log(`Products with category_id !== null: ${withCat.length}`);
        if (withCat.length > 0) {
            console.log("Sample products with category:", withCat.slice(0, 5));
        }

        const uniqueStoreIds = [...new Set(products.map(p => p.store_id))];
        console.log("Unique store_ids on products:", uniqueStoreIds);

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
