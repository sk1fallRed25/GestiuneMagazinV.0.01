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

        console.log("Signed in successfully!");

        const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select('id, name, active, lifecycle_status');
        if (storesError) throw storesError;
        console.log("Stores:", stores);

        const { data: categories, error: catsError } = await supabase
            .from('categories')
            .select('id, name, parent_id');
        if (catsError) throw catsError;
        console.log("Categories count:", categories.length);
        console.log("Categories sample:", categories.slice(0, 5));

        const { data: receptions, error: recsError } = await supabase
            .from('receptions')
            .select('id, document_number, status, total_value');
        if (recsError) throw recsError;
        console.log("Receptions:", receptions);

        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, barcode, category_id, status, store_id');
        if (prodError) throw prodError;

        console.log(`Total Products: ${products.length}`);
        console.log("Products:", products);

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
