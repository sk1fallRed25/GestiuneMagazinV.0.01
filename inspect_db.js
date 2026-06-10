import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
const dbPath = path.join(appData, 'sistem-magazin', 'offline_cache.db');
const dbPathAlternative = path.join(appData, 'Sistem Gestiune Magazin', 'offline_cache.db');

let actualDbPath = '';
if (fs.existsSync(dbPath)) {
    actualDbPath = dbPath;
} else if (fs.existsSync(dbPathAlternative)) {
    actualDbPath = dbPathAlternative;
} else {
    console.log("Could not find offline_cache.db at standard paths:\n1. " + dbPath + "\n2. " + dbPathAlternative);
    process.exit(1);
}

console.log("Found database at: " + actualDbPath);
const db = new Database(actualDbPath, { readonly: true });

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

    // Let's count products with category_id pointing to a subcategory (i.e. having a parent_id)
    const prodsWithParentCat = db.prepare(`
        SELECT p.product_id, p.name, p.category_id, c.name as cat_name, c.parent_id
        FROM local_products p
        JOIN local_categories c ON p.category_id = c.id
    `).all();

    console.log(`\n--- Products mapped to a local category (${prodsWithParentCat.length} rows) ---`);
    const withSubcat = prodsWithParentCat.filter(p => p.parent_id !== null);
    console.log(`Products mapped to subcategories (parent_id is not null): ${withSubcat.length}`);
    if (withSubcat.length > 0) {
        console.log("Sample products with subcategories:", withSubcat.slice(0, 5));
    }

    const withoutSubcat = prodsWithParentCat.filter(p => p.parent_id === null);
    console.log(`Products mapped to root categories (parent_id is null): ${withoutSubcat.length}`);
    if (withoutSubcat.length > 0) {
        console.log("Sample products with root categories:", withoutSubcat.slice(0, 5));
    }
} catch (err) {
    console.error("Error querying SQLite database:", err);
} finally {
    db.close();
}
