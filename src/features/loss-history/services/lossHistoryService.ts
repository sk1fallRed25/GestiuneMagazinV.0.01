import { supabase } from '../../../shared/supabase/supabaseClient';
import { LossHistoryItem, LossHistoryFilters, LossDetails, LossHistorySummary, WasteEventRow, WasteItemRow, ProductRow, StockBatchRow, ProfileRow } from '../types';

const toNumberStrict = (value: unknown, fieldLabel: string): number => {
    const num = Number(value);
    if (value === null || value === undefined || isNaN(num) || !Number.isFinite(num)) {
        throw new Error(`${fieldLabel} trebuie să fie un număr valid.`);
    }
    return num;
};

const toNumberSafe = (value: unknown, fallback = 0): number => {
    const num = Number(value);
    return (value === null || value === undefined || isNaN(num) || !Number.isFinite(num)) ? fallback : num;
};

const normalizeZone = (value: unknown): 'depozit' | 'magazin' | null => {
    return value === 'depozit' || value === 'magazin' ? value : null;
};

export const lossHistoryService = {
    async listLossHistory(storeId: string, filters?: LossHistoryFilters): Promise<LossHistoryItem[]> {
        if (!storeId) throw new Error("Store ID lipsă.");

        // 1. Fetch Events
        let eventQuery = supabase.from('waste_events').select('*').eq('store_id', storeId);
        
        if (filters?.dateFrom) {
            eventQuery = eventQuery.gte('created_at', filters.dateFrom + 'T00:00:00.000Z');
        }
        if (filters?.dateTo) {
            eventQuery = eventQuery.lte('created_at', filters.dateTo + 'T23:59:59.999Z');
        }
        if (filters?.reason && filters.reason !== 'all') {
            eventQuery = eventQuery.eq('reason', filters.reason);
        }

        const { data: events, error: eventsErr } = await eventQuery;
        if (eventsErr) throw eventsErr;
        if (!events || events.length === 0) return [];

        const eventRows = events as WasteEventRow[];
        const eventIds = eventRows.map(e => e.id);
        const profileIds = Array.from(new Set(eventRows.map(e => e.profile_id).filter(Boolean)));

        // 2. Fetch Items
        const { data: items, error: itemsErr } = await supabase
            .from('waste_items')
            .select('*')
            .eq('store_id', storeId)
            .in('waste_id', eventIds);

        if (itemsErr) throw itemsErr;
        if (!items || items.length === 0) return [];
        const itemRows = items as WasteItemRow[];

        const productIds = Array.from(new Set(itemRows.map(i => i.product_id)));
        const batchIds = Array.from(new Set(itemRows.map(i => i.batch_id).filter(Boolean))) as string[];

        // 3. Fetch Products, Batches, Profiles
        const [productsRes, batchesRes, profilesRes] = await Promise.all([
            supabase.from('products').select('id, name, barcode, unit').eq('store_id', storeId).in('id', productIds),
            batchIds.length > 0 ? supabase.from('stock_batches').select('id, batch_number, expiry_date, zone, purchase_price').eq('store_id', storeId).in('id', batchIds) : { data: [], error: null },
            profileIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', profileIds) : { data: [], error: null }
        ]);

        if (productsRes.error) throw productsRes.error;
        if (batchesRes.error) throw batchesRes.error;
        if (profilesRes.error) throw profilesRes.error;

        const productMap = new Map((productsRes.data as ProductRow[]).map(p => [p.id, p]));
        const batchMap = new Map((batchesRes.data as StockBatchRow[]).map(b => [b.id, b]));
        const profileMap = new Map((profilesRes.data as ProfileRow[]).map(p => [p.id, p]));
        const eventMap = new Map(eventRows.map(e => [e.id, e]));

        let result: LossHistoryItem[] = itemRows.map(item => {
            const ev = eventMap.get(item.waste_id);
            const prod = productMap.get(item.product_id);
            const batch = item.batch_id ? batchMap.get(item.batch_id) : undefined;
            const prof = ev?.profile_id ? profileMap.get(ev.profile_id) : undefined;

            const quantity = toNumberStrict(item.quantity, 'Cantitatea');
            const purchasePrice = batch?.purchase_price != null ? toNumberStrict(batch.purchase_price, 'Prețul de achiziție') : null;
            const estimatedValue = purchasePrice != null ? quantity * purchasePrice : 0;

            return {
                eventId: ev?.id || item.waste_id,
                itemId: item.id,
                createdAt: ev?.created_at || item.created_at,
                reason: ev?.reason || 'Necunoscut',
                description: ev?.description || null,
                productId: item.product_id,
                productName: prod?.name || 'Produs sters',
                barcode: prod?.barcode || '-',
                quantity,
                unit: prod?.unit || 'buc',
                zone: normalizeZone(batch?.zone),
                batchId: item.batch_id,
                batchNumber: batch?.batch_number || null,
                expiryDate: batch?.expiry_date || null,
                purchasePrice,
                estimatedValue,
                operatorName: prof?.full_name || 'Necunoscut'
            };
        });

        // 4. Client-side filters (Search + Zone)
        if (filters?.zone && filters.zone !== 'all') {
            result = result.filter(r => r.zone === filters.zone);
        }

        if (filters?.search) {
            const s = filters.search.toLowerCase();
            result = result.filter(r => 
                r.productName.toLowerCase().includes(s) || 
                r.barcode.toLowerCase().includes(s) ||
                r.reason.toLowerCase().includes(s) ||
                r.eventId.toLowerCase().includes(s)
            );
        }

        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return result;
    },

    async getLossDetails(storeId: string, eventId: string): Promise<LossDetails> {
        // Pentru volume mari, optimizăm ulterior prin query direct pe eventId.
        const events = await this.listLossHistory(storeId);
        const items = events.filter(e => e.eventId === eventId);
        
        if (items.length === 0) {
            throw new Error("Evenimentul nu a fost găsit.");
        }

        const first = items[0];
        return {
            eventId: first.eventId,
            createdAt: first.createdAt,
            reason: first.reason,
            description: first.description,
            operatorName: first.operatorName,
            items: items
        };
    },

    getLossSummary(items: LossHistoryItem[]): LossHistorySummary {
        const eventIds = new Set<string>();
        let totalQuantity = 0;
        let estimatedValue = 0;
        const reasonCounts = new Map<string, number>();

        items.forEach(item => {
            eventIds.add(item.eventId);
            totalQuantity += item.quantity;
            estimatedValue += item.estimatedValue;
            reasonCounts.set(item.reason, (reasonCounts.get(item.reason) || 0) + 1);
        });

        const topReasons = Array.from(reasonCounts.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            eventsCount: eventIds.size,
            totalQuantity,
            estimatedValue,
            topReasons
        };
    }
};
