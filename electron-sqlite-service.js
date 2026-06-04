import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';

let db = null;

/**
 * Initializes the SQLite database file and tables in the userData folder.
 * @param {string} userDataPath Path to Electron's userData folder.
 */
export function initDb(userDataPath) {
    if (db) return db;

    try {
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }

        const dbPath = path.join(userDataPath, 'offline_cache.db');
        console.log(`[SQLite Service] Opening SQLite database at: ${dbPath}`);

        db = new Database(dbPath, { verbose: console.log });

        // Enable WAL mode and foreign key constraints
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('foreign_keys = ON');

        createSchemas();

        console.log('[SQLite Service] Database schemas initialized successfully.');
        return db;
    } catch (err) {
        console.error('[SQLite Service] Failed to initialize SQLite database:', err);
        throw err;
    }
}

/**
 * Create tables and indexes if they do not exist.
 */
function createSchemas() {
    // 1. Products catalog
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_products (
            product_id TEXT PRIMARY KEY,
            barcode TEXT,
            name TEXT,
            unit TEXT,
            category_id TEXT,
            active INTEGER DEFAULT 1,
            sgr_enabled INTEGER DEFAULT 0,
            sgr_type TEXT
        )
    `);

    // 2. Pricing catalog
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_product_prices (
            product_id TEXT,
            store_id TEXT,
            price_sale REAL,
            vat_group TEXT,
            vat_percent REAL,
            PRIMARY KEY (product_id, store_id)
        )
    `);

    // 3. Stock snapshots
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_stock_snapshot (
            product_id TEXT,
            store_id TEXT,
            total_stock REAL,
            PRIMARY KEY (product_id, store_id)
        )
    `);

    // 4. Categories catalog
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_categories (
            id TEXT PRIMARY KEY,
            parent_id TEXT,
            name TEXT
        )
    `);

    // 5. Shift state
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_shift_state (
            shift_id TEXT PRIMARY KEY,
            store_id TEXT,
            cashier_profile_id TEXT,
            opened_at TEXT,
            status TEXT,
            synced_at TEXT
        )
    `);

    // 6. Store Settings
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_store_settings (
            store_id TEXT PRIMARY KEY,
            name TEXT,
            tax_settings_json TEXT
        )
    `);

    // 7. Sync Metadata
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_sync_metadata (
            store_id TEXT PRIMARY KEY,
            last_sync_at TEXT,
            checksum TEXT,
            sync_type TEXT,
            row_counts_json TEXT
        )
    `);

    // 8. Offline Sales Queue (prepared for 6APP.7 sync)
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_offline_sales_queue (
            local_sale_id TEXT PRIMARY KEY,
            store_id TEXT,
            device_id TEXT,
            shift_id TEXT,
            cashier_profile_id TEXT,
            created_at_local TEXT,
            status TEXT,
            cart_items_json TEXT,
            payments_json TEXT,
            totals_json TEXT,
            sgr_totals_json TEXT,
            vat_breakdown_json TEXT,
            payload_hash TEXT,
            sync_attempts INTEGER DEFAULT 0,
            last_error TEXT,
            synced_sale_id TEXT,
            fiscal_status TEXT,
            updated_at_local TEXT
        )
    `);

    // Indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON local_products (barcode)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_products_name ON local_products (name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prices_store ON local_product_prices (store_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stock_store ON local_stock_snapshot (store_id)`);
}

/**
 * Atomically saves a cache bundle fetched from the server.
 * @param {string} storeId Store identifier.
 * @param {object} bundle Cache bundle payload.
 */
export function saveCacheBundle(storeId, bundle) {
    if (!db) throw new Error('Database not initialized.');
    if (!storeId) throw new Error('storeId is required.');
    if (!bundle) throw new Error('Bundle payload is required.');

    const { products = [], prices = [], stocks = [], categories = [], active_shift = null, store_settings = null, metadata = {} } = bundle;

    // Use a transaction for absolute ACID safety
    const insertTransaction = db.transaction(() => {
        // Clear existing cache for the store to prevent residues
        // NOTE: In incremental sync we might want to overwrite or keep others, but since get_offline_cache_bundle aggregates all current items,
        // purging first is the safest full refresh strategy.
        db.prepare('DELETE FROM local_products').run(); // Clear products
        db.prepare('DELETE FROM local_product_prices WHERE store_id = ?').run(storeId);
        db.prepare('DELETE FROM local_stock_snapshot WHERE store_id = ?').run(storeId);
        db.prepare('DELETE FROM local_categories').run(); // Categories are store specific
        
        // 1. Insert products
        const insertProduct = db.prepare(`
            INSERT OR REPLACE INTO local_products (product_id, barcode, name, unit, category_id, active, sgr_enabled, sgr_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of products) {
            insertProduct.run(
                p.id,
                p.barcode || '',
                p.name || '',
                p.unit || 'buc',
                p.category_id || null,
                p.active ? 1 : 0,
                p.sgr_enabled ? 1 : 0,
                p.sgr_type || null
            );
        }

        // 2. Insert prices
        const insertPrice = db.prepare(`
            INSERT OR REPLACE INTO local_product_prices (product_id, store_id, price_sale, vat_group, vat_percent)
            VALUES (?, ?, ?, ?, ?)
        `);
        for (const pr of prices) {
            insertPrice.run(
                pr.product_id,
                storeId,
                pr.price_sale || 0,
                pr.vat_group || 'TVA19',
                pr.vat_percent || 19.0
            );
        }

        // 3. Insert stocks
        const insertStock = db.prepare(`
            INSERT OR REPLACE INTO local_stock_snapshot (product_id, store_id, total_stock)
            VALUES (?, ?, ?)
        `);
        for (const st of stocks) {
            insertStock.run(
                st.product_id,
                storeId,
                st.total_stock || 0
            );
        }

        // 4. Insert categories
        const insertCategory = db.prepare(`
            INSERT OR REPLACE INTO local_categories (id, parent_id, name)
            VALUES (?, ?, ?)
        `);
        for (const cat of categories) {
            insertCategory.run(
                cat.id,
                cat.parent_id || null,
                cat.name || ''
            );
        }

        // 5. Active shift state (if present)
        if (active_shift) {
            db.prepare(`
                INSERT OR REPLACE INTO local_shift_state (shift_id, store_id, cashier_profile_id, opened_at, status, synced_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                active_shift.id,
                storeId,
                active_shift.opened_by,
                active_shift.opened_at,
                active_shift.status,
                new Date().toISOString()
            );
        }

        // 6. Store Settings
        if (store_settings) {
            db.prepare(`
                INSERT OR REPLACE INTO local_store_settings (store_id, name, tax_settings_json)
                VALUES (?, ?, ?)
            `).run(
                storeId,
                store_settings.name || '',
                JSON.stringify(store_settings.tax || {})
            );
        }

        // 7. Update Sync Metadata
        const nowStr = new Date().toISOString();
        db.prepare(`
            INSERT OR REPLACE INTO local_sync_metadata (store_id, last_sync_at, checksum, sync_type, row_counts_json)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            storeId,
            nowStr,
            metadata.checksum || '',
            metadata.sync_type || 'full',
            JSON.stringify(metadata.row_counts || {})
        );
    });

    insertTransaction();
    console.log(`[SQLite Service] Atomically saved cache bundle for store ${storeId}.`);
    return { success: true };
}

/**
 * Searches local products using wildcard keyword search.
 * Returns joined products with pricing and stock.
 * @param {string} storeId Store identifier.
 * @param {string} queryText Search query (searches names and barcodes).
 * @param {number} limit Maximum rows.
 */
export function searchLocalProducts(storeId, queryText, limit = 50) {
    if (!db) throw new Error('Database not initialized.');
    if (!storeId) throw new Error('storeId is required.');

    const cleanQuery = `%${(queryText || '').trim()}%`;

    const stmt = db.prepare(`
        SELECT 
            p.product_id AS id,
            p.name,
            p.barcode,
            p.unit,
            p.category_id,
            p.active,
            p.sgr_enabled,
            p.sgr_type,
            pr.price_sale,
            pr.vat_group,
            pr.vat_percent,
            COALESCE(st.total_stock, 0) AS total_stock
        FROM local_products p
        JOIN local_product_prices pr ON p.product_id = pr.product_id AND pr.store_id = ?
        LEFT JOIN local_stock_snapshot st ON p.product_id = st.product_id AND st.store_id = ?
        WHERE (p.name LIKE ? OR p.barcode LIKE ?)
          AND p.active = 1
        LIMIT ?
    `);

    const rows = stmt.all(storeId, storeId, cleanQuery, cleanQuery, limit);
    return rows.map(r => ({
        id: r.id,
        name: r.name,
        barcode: r.barcode,
        unit: r.unit || 'buc',
        priceSale: r.price_sale || 0,
        vatPercent: r.vat_percent || 19,
        stockMagazin: r.total_stock || 0,
        sgrEnabled: !!r.sgr_enabled,
        sgrType: r.sgr_type,
        categoryId: r.category_id
    }));
}

/**
 * Look up a single active product by exact barcode.
 * @param {string} storeId Store identifier.
 * @param {string} barcode Barcode.
 */
export function getLocalProductByBarcode(storeId, barcode) {
    if (!db) throw new Error('Database not initialized.');
    if (!storeId) throw new Error('storeId is required.');
    if (!barcode) return null;

    const stmt = db.prepare(`
        SELECT 
            p.product_id AS id,
            p.name,
            p.barcode,
            p.unit,
            p.category_id,
            p.active,
            p.sgr_enabled,
            p.sgr_type,
            pr.price_sale,
            pr.vat_group,
            pr.vat_percent,
            COALESCE(st.total_stock, 0) AS total_stock
        FROM local_products p
        JOIN local_product_prices pr ON p.product_id = pr.product_id AND pr.store_id = ?
        LEFT JOIN local_stock_snapshot st ON p.product_id = st.product_id AND st.store_id = ?
        WHERE p.barcode = ? AND p.active = 1
        LIMIT 1
    `);

    const r = stmt.get(storeId, storeId, barcode);
    if (!r) return null;

    return {
        id: r.id,
        name: r.name,
        barcode: r.barcode,
        unit: r.unit || 'buc',
        priceSale: r.price_sale || 0,
        vatPercent: r.vat_percent || 19,
        stockMagazin: r.total_stock || 0,
        sgrEnabled: !!r.sgr_enabled,
        sgrType: r.sgr_type,
        categoryId: r.category_id
    };
}

/**
 * Queries counts and sync stats.
 * @param {string} storeId Store identifier.
 */
export function getLocalCacheStatus(storeId) {
    if (!db) throw new Error('Database not initialized.');
    if (!storeId) return { initialized: false };

    try {
        const productCount = db.prepare('SELECT COUNT(*) AS count FROM local_products').get().count;
        const priceCount = db.prepare('SELECT COUNT(*) AS count FROM local_product_prices WHERE store_id = ?').get(storeId).count;
        const stockCount = db.prepare('SELECT COUNT(*) AS count FROM local_stock_snapshot WHERE store_id = ?').get(storeId).count;
        const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM local_categories').get().count;

        const metadata = db.prepare('SELECT * FROM local_sync_metadata WHERE store_id = ?').get(storeId);

        return {
            initialized: true,
            productCount,
            priceCount,
            stockCount,
            categoryCount,
            lastSyncAt: metadata ? metadata.last_sync_at : null,
            checksum: metadata ? metadata.checksum : null,
            syncType: metadata ? metadata.sync_type : null,
            rowCountsJson: metadata ? metadata.row_counts_json : '{}'
        };
    } catch (err) {
        console.error('[SQLite Service] Error querying local cache status:', err);
        return { initialized: false, error: err.message };
    }
}

/**
 * Persists the local active shift.
 * @param {object} shift Shift object.
 */
export function saveLocalShiftState(shift) {
    if (!db) throw new Error('Database not initialized.');
    if (!shift || !shift.shift_id) throw new Error('Invalid shift data.');

    db.prepare(`
        INSERT OR REPLACE INTO local_shift_state (shift_id, store_id, cashier_profile_id, opened_at, status, synced_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        shift.shift_id,
        shift.store_id,
        shift.cashier_profile_id,
        shift.opened_at,
        shift.status,
        new Date().toISOString()
    );

    return { success: true };
}

/**
 * Reads local shift state for a cashier.
 * @param {string} storeId Store identifier.
 * @param {string} cashierId Cashier profile identifier.
 */
export function getLocalShiftState(storeId, cashierId) {
    if (!db) throw new Error('Database not initialized.');

    const stmt = db.prepare(`
        SELECT * FROM local_shift_state
        WHERE store_id = ? AND cashier_profile_id = ? AND status = 'open'
        LIMIT 1
    `);
    const row = stmt.get(storeId, cashierId);
    return row || null;
}

/**
 * Returns or creates persistent unique device fingerprint and name.
 * @param {string} userDataPath Path to Electron's userData folder.
 */
export function getOrCreateDeviceInfo(userDataPath) {
    const configPath = path.join(userDataPath, 'device_id.json');
    try {
        if (fs.existsSync(configPath)) {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (data.fingerprint && data.name) {
                return data;
            }
        }
    } catch (e) {
        console.error('[SQLite Service] Error reading device_id.json, recreating...', e);
    }

    const fingerprint = crypto.randomUUID().replace(/-/g, ''); // 32 chars alphanumeric hex
    const hostname = os.hostname() || 'Desktop-Client';
    const name = `POS-${hostname}`;

    const deviceData = { fingerprint, name };
    try {
        fs.writeFileSync(configPath, JSON.stringify(deviceData, null, 2), 'utf8');
        console.log(`[SQLite Service] Generated new device identity: ${name} (${fingerprint})`);
    } catch (e) {
        console.error('[SQLite Service] Error writing device_id.json:', e);
    }
    return deviceData;
}

