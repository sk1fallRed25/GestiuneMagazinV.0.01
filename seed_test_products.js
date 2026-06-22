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

        const storeId = 'b6d06d77-8ead-483f-8a21-87788f624da4';
        const categoryId = '708b441c-07ba-42d3-932d-00f9a20598be';

        const testProducts = [
            {
                name: 'OTET 1L',
                barcode: '6422336000013',
                price_sale: 5.0,
                price_purchase: 3.0,
            },
            {
                name: 'ROSHEN EXTRA CRUNCH CAP',
                barcode: '4823077642098',
                price_sale: 4.0,
                price_purchase: 2.0,
            }
        ];

        for (const p of testProducts) {
            console.log(`Checking product: ${p.name}...`);
            const { data: existing, error: checkError } = await supabase
                .from('products')
                .select('id')
                .eq('store_id', storeId)
                .eq('barcode', p.barcode)
                .neq('status', 'deleted')
                .maybeSingle();
            
            if (checkError) throw checkError;

            let productId;
            if (existing) {
                console.log(`Product ${p.name} already exists with ID ${existing.id}`);
                productId = existing.id;
            } else {
                console.log(`Inserting product ${p.name}...`);
                const { data: newProd, error: insertError } = await supabase
                    .from('products')
                    .insert([{
                        store_id: storeId,
                        name: p.name,
                        barcode: p.barcode,
                        unit: 'buc',
                        status: 'active',
                        category_id: categoryId,
                        sgr_enabled: false
                    }])
                    .select('id')
                    .single();
                
                if (insertError) throw insertError;
                productId = newProd.id;
                console.log(`Inserted product ${p.name} with ID ${productId}`);
            }

            console.log(`Upserting price for product ${p.name}...`);
            const { error: priceError } = await supabase
                .from('product_prices')
                .upsert([{
                    store_id: storeId,
                    product_id: productId,
                    price_sale: p.price_sale,
                    price_purchase: p.price_purchase,
                    vat_percent: 21,
                    vat_group: 'A',
                    updated_at: new Date().toISOString()
                }], { onConflict: 'store_id,product_id' });
            
            if (priceError) throw priceError;
            console.log(`Price upserted successfully for ${p.name}`);
        }

        console.log("Seeding complete!");
    } catch (err) {
        console.error("Error during seeding:", err);
    }
}

run();
