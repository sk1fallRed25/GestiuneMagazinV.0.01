import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

app.whenReady().then(() => {
    const dbPath = 'C:\\Users\\stefan\\AppData\\Roaming\\Sistem Gestiune Magazin\\offline_cache.db';

    console.log("Using hardcoded database path: " + dbPath);

    if (!fs.existsSync(dbPath)) {
        console.log("Database file does not exist at " + dbPath);
        app.quit();
        return;
    }

    const db = new Database(dbPath, { readonly: true });

    try {
        const products = db.prepare("SELECT * FROM local_products").all();
        console.log(`\n--- Local Products (${products.length} rows) ---`);
        if (products.length > 0) {
            console.log("Sample product row:", products[0]);
        }

        const categories = db.prepare("SELECT * FROM local_categories").all();
        console.log(`\n--- Local Categories (${categories.length} rows) ---`);
        if (categories.length > 0) {
            console.log("Categories sample:", categories.slice(0, 10));
        }

        const prodsWithParentCat = db.prepare(`
            SELECT p.product_id, p.name, p.category_id, c.name as cat_name, c.parent_id
            FROM local_products p
            LEFT JOIN local_categories c ON p.category_id = c.id
        `).all();

        console.log(`\n--- Products mapped to a local category (${prodsWithParentCat.length} rows) ---`);
        const withSubcat = prodsWithParentCat.filter(p => p.category_id && p.parent_id !== null);
        console.log(`Products mapped to subcategories (parent_id is not null): ${withSubcat.length}`);
        if (withSubcat.length > 0) {
            console.log("Sample products with subcategories:", withSubcat.slice(0, 5));
        }

        const withoutSubcat = prodsWithParentCat.filter(p => p.category_id && p.parent_id === null);
        console.log(`Products mapped to root categories (parent_id is null): ${withoutSubcat.length}`);
        if (withoutSubcat.length > 0) {
            console.log("Sample products with root categories:", withoutSubcat.slice(0, 5));
        }

        const nullCat = prodsWithParentCat.filter(p => !p.category_id);
        console.log(`Products with null category_id: ${nullCat.length}`);
        if (nullCat.length > 0) {
            console.log("Sample products with null category:", nullCat.slice(0, 5));
        }
    } catch (err) {
        console.error("Error querying SQLite database:", err);
    } finally {
        db.close();
        app.quit();
    }
});
