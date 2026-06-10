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

        const storeId = '00000000-0000-0000-0000-000000000001';

        // Find a device
        const { data: devices, error: devError } = await supabase
            .from('pos_devices')
            .select('*')
            .eq('store_id', storeId);
        if (devError) throw devError;

        console.log("Found devices:", devices.map(d => ({ id: d.id, name: d.name })));
        if (devices.length === 0) {
            console.log("No devices found, cannot call RPC.");
            return;
        }
        const deviceId = devices[0].id;

        console.log(`Calling get_offline_cache_bundle with storeId=${storeId}, deviceId=${deviceId}...`);
        const { data: bundle, error: bundleError } = await supabase.rpc('get_offline_cache_bundle', {
            p_store_id: storeId,
            p_device_id: deviceId
        });

        if (bundleError) throw bundleError;

        console.log("Bundle keys:", Object.keys(bundle));
        console.log("Products in bundle count:", bundle.products?.length);
        console.log("Categories in bundle count:", bundle.categories?.length);

        if (bundle.products && bundle.products.length > 0) {
            console.log("\nSample Product in bundle:");
            console.log(JSON.stringify(bundle.products[0], null, 2));

            // Check if any product has category_id or anything related
            const productsWithCategory = bundle.products.filter(p => p.category_id !== undefined);
            console.log(`\nProducts with 'category_id' key present: ${productsWithCategory.length}`);

            const productsWithCategoryNotNull = bundle.products.filter(p => p.category_id !== null);
            console.log(`Products with 'category_id' not null: ${productsWithCategoryNotNull.length}`);
            
            // Log other keys on product
            console.log("Keys on first product:", Object.keys(bundle.products[0]));
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
