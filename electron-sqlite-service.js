import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import { app } from 'electron';
import logLib from 'electron-log/main.js';

const mainLog = logLib.create({ logId: 'main' });
mainLog.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs', 'main.log');

let db = null;

let dbState = {
    initialized: false,
    corrupted: false,
    recreated: false,
    path: '',
    error: null
};

/**
 * Returns the SQLite diagnostics state.
 */
export function getDbState() {
    return dbState;
}

/**
 * Initializes the SQLite database file and tables in the userData folder.
 * @param {string} userDataPath Path to Electron's userData folder.
 */
export function initDb(userDataPath) {
    if (db) return db;

    const dbPath = path.join(userDataPath, 'offline_cache.db');
    dbState.path = dbPath;

    const tryInit = (attemptPath) => {
        const localDb = new Database(attemptPath);
        // Enable WAL mode and foreign key constraints
        localDb.pragma('journal_mode = WAL');
        localDb.pragma('synchronous = NORMAL');
        localDb.pragma('foreign_keys = ON');

        // Integrity check
        const check = localDb.pragma('integrity_check');
        if (!check || check.length === 0 || check[0].integrity_check !== 'ok') {
            throw new Error('SQLite integrity check failed: ' + JSON.stringify(check));
        }
        return localDb;
    };

    try {
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }
        mainLog.info(`[SQLite Service] Opening SQLite database at: ${dbPath}`);
        db = tryInit(dbPath);
        createSchemas();
        mainLog.info('[SQLite Service] Database schemas initialized successfully.');
        dbState.initialized = true;
        return db;
    } catch (err) {
        mainLog.error('[SQLite Service] Local database is corrupt or failed to initialize, running recovery...', err);
        
        dbState.corrupted = true;
        dbState.error = err.message || String(err);

        // Close connection safely
        if (db) {
            try { db.close(); } catch (e) {}
            db = null;
        }

        // Automatic backup of corrupt database
        if (fs.existsSync(dbPath)) {
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupPath = path.join(userDataPath, `offline_cache.corrupt.${timestamp}.db`);
                fs.renameSync(dbPath, backupPath);
                mainLog.info(`[SQLite Service] Backed up corrupt database to: ${backupPath}`);
            } catch (backupErr) {
                mainLog.error('[SQLite Service] Failed to backup corrupt database:', backupErr);
            }
        }

        // Recreate database file and schemas
        try {
            mainLog.info('[SQLite Service] Recreating clean database...');
            db = new Database(dbPath);
            db.pragma('journal_mode = WAL');
            db.pragma('synchronous = NORMAL');
            db.pragma('foreign_keys = ON');
            createSchemas();
            mainLog.info('[SQLite Service] Recreated and initialized schemas successfully.');
            dbState.recreated = true;
            dbState.initialized = true;
            return db;
        } catch (recreateErr) {
            mainLog.error('[SQLite Service] CRITICAL: Failed to recreate database after corruption:', recreateErr);
            throw recreateErr;
        }
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
            fiscal_status TEXT DEFAULT 'pending_after_sync',
            updated_at_local TEXT
        )
    `);

    // Schema migration for 6APP.7: ensure device_fingerprint exists
    try {
        const columns = db.pragma("table_info(local_offline_sales_queue)");
        const hasFingerprint = columns.some(c => c.name === 'device_fingerprint');
        if (!hasFingerprint) {
            console.log('[SQLite Service] Migrating local_offline_sales_queue: adding device_fingerprint column.');
            db.exec('ALTER TABLE local_offline_sales_queue ADD COLUMN device_fingerprint TEXT');
            db.exec('UPDATE local_offline_sales_queue SET device_fingerprint = COALESCE(device_id, "unknown")');
        }
    } catch (err) {
        console.error('[SQLite Service] Migration of local_offline_sales_queue failed:', err);
    }

    // 9. Local POS Cart Events
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_pos_cart_events (
            id TEXT PRIMARY KEY,
            store_id TEXT,
            cashier_profile_id TEXT,
            device_fingerprint TEXT,
            event_type TEXT,
            product_id TEXT,
            product_name TEXT,
            barcode TEXT,
            quantity_before REAL,
            quantity_after REAL,
            reason TEXT,
            created_at_local TEXT,
            synced_status TEXT DEFAULT 'local_only'
        )
    `);

    // Indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON local_products (barcode)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_products_name ON local_products (name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_prices_store ON local_product_prices (store_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stock_store ON local_stock_snapshot (store_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_offline_sales_status ON local_offline_sales_queue (status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_offline_sales_created ON local_offline_sales_queue (created_at_local DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_offline_sales_store_status ON local_offline_sales_queue (store_id, status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_cart_events_store ON local_pos_cart_events (store_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_cart_events_created ON local_pos_cart_events (created_at_local DESC)`);
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

/**
 * Validates that all cart item product IDs and their pricing snapshots exist locally.
 * @param {string} storeId Store identifier.
 * @param {string[]} itemIds Array of product IDs to validate.
 */
export function validateCartItemsLocal(storeId, itemIds) {
    if (!db) throw new Error('Database not initialized.');
    if (!storeId) throw new Error('storeId is required.');
    if (!Array.isArray(itemIds)) throw new Error('itemIds must be an array.');

    const stmtProduct = db.prepare('SELECT product_id FROM local_products WHERE product_id = ? AND active = 1');
    const stmtPrice = db.prepare('SELECT price_sale FROM local_product_prices WHERE product_id = ? AND store_id = ?');

    for (const id of itemIds) {
        const prod = stmtProduct.get(id);
        if (!prod) {
            return { valid: false, reason: 'missing_product', productId: id };
        }
        const price = stmtPrice.get(id, storeId);
        if (!price) {
            return { valid: false, reason: 'missing_price', productId: id };
        }
    }

    return { valid: true };
}

/**
 * Enqueues a new offline sale in the local SQLite queue.
 * @param {object} sale Sale payload details.
 */
export function enqueueOfflineSale(sale) {
    if (!db) throw new Error('Database not initialized.');
    
    const {
        local_sale_id,
        store_id,
        device_fingerprint,
        shift_id,
        cashier_profile_id,
        created_at_local,
        status,
        cart_items_json,
        payments_json,
        totals_json,
        sgr_totals_json = null,
        vat_breakdown_json = null,
        fiscal_status = 'pending_after_sync'
    } = sale;

    if (!local_sale_id || typeof local_sale_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(local_sale_id)) {
        throw new Error('Invalid local_sale_id. Must be a valid UUID.');
    }
    if (!store_id || typeof store_id !== 'string') {
        throw new Error('store_id is required.');
    }
    if (!device_fingerprint || typeof device_fingerprint !== 'string') {
        throw new Error('device_fingerprint is required.');
    }
    if (!cashier_profile_id || typeof cashier_profile_id !== 'string') {
        throw new Error('cashier_profile_id is required.');
    }
    if (!created_at_local || typeof created_at_local !== 'string') {
        throw new Error('created_at_local is required.');
    }
    if (status !== 'queued') {
        throw new Error('Initial status must be queued.');
    }

    try {
        const items = JSON.parse(cart_items_json);
        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('cart_items_json must be a non-empty array.');
        }
    } catch (e) {
        throw new Error('Invalid cart_items_json: ' + e.message);
    }

    try {
        JSON.parse(payments_json);
    } catch (e) {
        throw new Error('Invalid payments_json: ' + e.message);
    }

    try {
        JSON.parse(totals_json);
    } catch (e) {
        throw new Error('Invalid totals_json: ' + e.message);
    }

    if (sgr_totals_json) {
        try { JSON.parse(sgr_totals_json); } catch (e) { throw new Error('Invalid sgr_totals_json'); }
    }
    if (vat_breakdown_json) {
        try { JSON.parse(vat_breakdown_json); } catch (e) { throw new Error('Invalid vat_breakdown_json'); }
    }

    const allowedFiscalStatuses = ['not_allowed_offline', 'pending_after_sync', 'fiscalized', 'fiscal_failed'];
    if (!allowedFiscalStatuses.includes(fiscal_status)) {
        throw new Error('Invalid fiscal_status.');
    }

    const canonicalPayload = {
        local_sale_id,
        store_id,
        device_fingerprint,
        shift_id,
        cashier_profile_id,
        created_at_local,
        cart_items_json,
        payments_json,
        totals_json
    };
    
    const canonicalStr = JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort());
    const payload_hash = crypto.createHash('sha256').update(canonicalStr).digest('hex');

    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO local_offline_sales_queue (
            local_sale_id, store_id, device_fingerprint, shift_id, cashier_profile_id,
            created_at_local, updated_at_local, status, cart_items_json, payments_json,
            totals_json, sgr_totals_json, vat_breakdown_json, payload_hash, sync_attempts,
            last_error, synced_sale_id, fiscal_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?)
    `).run(
        local_sale_id, store_id, device_fingerprint, shift_id, cashier_profile_id,
        created_at_local, now, 'queued', cart_items_json, payments_json,
        totals_json, sgr_totals_json, vat_breakdown_json, payload_hash, fiscal_status
    );

    return { success: true, local_sale_id, payload_hash };
}

/**
 * Lists all offline sales for a store.
 * @param {string} storeId Store identifier.
 */
export function listOfflineSales(storeId) {
    if (!db) throw new Error('Database not initialized.');
    if (!storeId) throw new Error('storeId is required.');
    
    return db.prepare(`
        SELECT * FROM local_offline_sales_queue
        WHERE store_id = ?
        ORDER BY created_at_local DESC
    `).all(storeId);
}

/**
 * Gets a single offline sale.
 * @param {string} localSaleId Local sale UUID.
 */
export function getOfflineSale(localSaleId) {
    if (!db) throw new Error('Database not initialized.');
    if (!localSaleId) throw new Error('localSaleId is required.');

    return db.prepare(`
        SELECT * FROM local_offline_sales_queue
        WHERE local_sale_id = ?
    `).get(localSaleId) || null;
}

/**
 * Updates status and sync details for an offline sale.
 */
export function updateOfflineSaleStatus(localSaleId, status, errorMsg = null, syncedSaleId = null) {
    if (!db) throw new Error('Database not initialized.');
    if (!localSaleId) throw new Error('localSaleId is required.');

    const allowedStatuses = ['queued', 'syncing', 'synced', 'failed', 'conflict', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
    }

    const now = new Date().toISOString();

    if (status === 'synced') {
        db.prepare(`
            UPDATE local_offline_sales_queue
            SET status = ?, last_error = ?, synced_sale_id = ?, updated_at_local = ?, sync_attempts = sync_attempts + 1
            WHERE local_sale_id = ?
        `).run(status, errorMsg, syncedSaleId, now, localSaleId);
    } else {
        db.prepare(`
            UPDATE local_offline_sales_queue
            SET status = ?, last_error = ?, updated_at_local = ?, sync_attempts = sync_attempts + 1
            WHERE local_sale_id = ?
        `).run(status, errorMsg, now, localSaleId);
    }

    return { success: true };
}

/**
 * Controlled hard-delete of an offline sale.
 */
export function deleteOfflineSale(localSaleId) {
    if (!db) throw new Error('Database not initialized.');
    if (!localSaleId) throw new Error('localSaleId is required.');

    db.prepare(`
        DELETE FROM local_offline_sales_queue
        WHERE local_sale_id = ?
    `).run(localSaleId);

    return { success: true };
}

/**
 * Returns summary metrics of offline sales.
 */
export function getOfflineSalesSummary(storeId) {
    if (!db) throw new Error('Database not initialized.');
    if (!storeId) throw new Error('storeId is required.');

    const allSales = db.prepare(`
        SELECT status, totals_json, created_at_local
        FROM local_offline_sales_queue
        WHERE store_id = ?
    `).all(storeId);

    let queuedCount = 0;
    let queuedTotal = 0;
    let lastSaleRow = null;

    for (const sale of allSales) {
        let grandTotal = 0;
        try {
            const totals = JSON.parse(sale.totals_json);
            grandTotal = totals.grandTotal || 0;
        } catch (e) {
            console.error('[SQLite Service] Failed to parse totals_json:', e);
        }

        if (sale.status === 'queued') {
            queuedCount++;
            queuedTotal += grandTotal;
        }

        if (!lastSaleRow || new Date(sale.created_at_local) > new Date(lastSaleRow.created_at_local)) {
            lastSaleRow = {
                created_at_local: sale.created_at_local,
                grandTotal
            };
        }
    }

    return {
        queuedCount,
        queuedTotal,
        lastSale: lastSaleRow ? {
            createdAtLocal: lastSaleRow.created_at_local,
            grandTotal: lastSaleRow.grandTotal
        } : null
    };
}

/**
 * Gets all active products for a store from the local SQLite cache (no limit).
 */
export function getAllLocalProducts(storeId) {
    if (!db) throw new Error('Database not initialized.');
    if (!storeId) throw new Error('storeId is required.');

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
        WHERE p.active = 1
    `);

    const rows = stmt.all(storeId, storeId);
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
 * Inserts a POS cart event log to the local SQLite database.
 */
export function logPosCartEvent(event) {
    if (!db) throw new Error('Database not initialized.');
    
    const id = event.id || (globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : 'evt_' + Math.random().toString(36).substring(2, 15));
    const store_id = event.store_id;
    const cashier_profile_id = event.cashier_profile_id;
    const device_fingerprint = event.device_fingerprint || 'unknown';
    const event_type = event.event_type;
    const product_id = event.product_id || null;
    const product_name = event.product_name || null;
    const barcode = event.barcode || null;
    const quantity_before = event.quantity_before !== undefined ? event.quantity_before : 0;
    const quantity_after = event.quantity_after !== undefined ? event.quantity_after : 0;
    const reason = event.reason || null;
    const created_at_local = new Date().toISOString();

    db.prepare(`
        INSERT INTO local_pos_cart_events (
            id, store_id, cashier_profile_id, device_fingerprint, event_type,
            product_id, product_name, barcode, quantity_before, quantity_after,
            reason, created_at_local, synced_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only')
    `).run(
        id, store_id, cashier_profile_id, device_fingerprint, event_type,
        product_id, product_name, barcode, quantity_before, quantity_after,
        reason, created_at_local
    );

    return { success: true, id };
}

/**
 * Lists the cart audit events for a store in reverse chronological order.
 */
export function listLocalPosCartEvents(storeId) {
    if (!db) throw new Error('Database not initialized.');
    if (!storeId) throw new Error('storeId is required.');

    return db.prepare(`
        SELECT * FROM local_pos_cart_events
        WHERE store_id = ?
        ORDER BY created_at_local DESC
    `).all(storeId);
}

/**
 * Gets all categories from the local SQLite cache.
 */
export function getLocalCategories() {
    if (!db) throw new Error('Database not initialized.');
    return db.prepare('SELECT id, parent_id, name FROM local_categories ORDER BY name ASC').all();
}


