import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    ReceptionProduct, 
    ReceptionLine, 
    ReceptionDocument,
    ReceptionDbRow
} from '../types';

export const receptionService = {
    /**
     * Listează produsele active pentru a fi selectate în recepție.
     * Include acum categoria din 6CAT.1.
     */
    async listReceptionProducts(storeId: string): Promise<ReceptionProduct[]> {
        if (!storeId) return [];

        const { data: products, error: pError } = await supabase
            .from('products')
            .select('*, category:categories(name)')
            .eq('store_id', storeId)
            .neq('status', 'deleted');

        if (pError) throw pError;
        if (!products || products.length === 0) return [];

        const { data: prices, error: prError } = await supabase
            .from('product_prices')
            .select('*')
            .eq('store_id', storeId)
            .in('product_id', products.map(p => p.id));

        if (prError) throw prError;

        const { data: stock, error: sError } = await supabase
            .from('stock_batches')
            .select('product_id, quantity')
            .eq('store_id', storeId);

        return products.map(p => {
            const price = prices?.find(pr => pr.product_id === p.id);
            const productStock = stock
                ? stock.filter(s => s.product_id === p.id).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
                : 0;
            // Look up category names
            const catObj = p.category as any;
            const categoryName = catObj?.name || undefined;

            return {
                id: p.id,
                nume: p.name,
                cod_bare: p.barcode,
                um: p.unit,
                pret_vanzare: Number(price?.price_sale) || 0,
                pret_achizitie: Number(price?.price_purchase) || 0,
                category_id: p.category_id,
                category_name: categoryName,
                stoc: productStock
            };
        });
    },

    /**
     * Listează istoricul de recepții pentru magazin.
     */
    async listReceptions(
        storeId: string, 
        filters?: { date?: string; supplier?: string; status?: string }
    ): Promise<ReceptionDbRow[]> {
        let query = supabase
            .from('receptions')
            .select('*, profiles(email)')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.date) {
            query = query.eq('reception_date', filters.date);
        }
        if (filters?.supplier) {
            query = query.ilike('supplier_text', `%${filters.supplier}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    /**
     * Încarcă o recepție specifică cu toate liniile sale.
     */
    async getReceptionDetails(storeId: string, receptionId: string): Promise<any> {
        const { data: reception, error: rError } = await supabase
            .from('receptions')
            .select('*, profiles(email)')
            .eq('store_id', storeId)
            .eq('id', receptionId)
            .single();

        if (rError) throw rError;

        const { data: items, error: iError } = await supabase
            .from('reception_items')
            .select('*, products(name, barcode, unit, category_id, category:categories(name))')
            .eq('store_id', storeId)
            .eq('reception_id', receptionId);

        if (iError) throw iError;

        return {
            ...reception,
            items: items || []
        };
    },

    /**
     * Salvează sau actualizează o recepție în starea DRAFT.
     */
    async saveDraft(
        storeId: string, 
        profileId: string, 
        document: ReceptionDocument, 
        lines: ReceptionLine[], 
        receptionId?: string
    ): Promise<string> {
        const totalValue = lines.reduce((acc, l) => acc + (l.quantity * l.purchasePrice), 0);
        let activeId = receptionId;

        if (!storeId || !profileId) throw new Error("Informații magazin/utilizator lipsă.");
        if (!document.documentNumber) throw new Error("Numărul documentului este obligatoriu.");
        if (lines.length === 0) throw new Error("Recepția trebuie să conțină cel puțin un produs.");

        if (activeId) {
            const { error: hError } = await supabase
                .from('receptions')
                .update({
                    document_number: document.documentNumber,
                    document_date: document.documentDate,
                    reception_date: document.receptionDate,
                    nir_number: document.nirNumber || null,
                    supplier_text: document.supplierText || null,
                    supplier_cui: document.supplierCui || null,
                    observations: document.observations || null,
                    total_value: totalValue
                })
                .eq('id', activeId)
                .eq('store_id', storeId);

            if (hError) throw hError;

            const { error: dError } = await supabase
                .from('reception_items')
                .delete()
                .eq('reception_id', activeId)
                .eq('store_id', storeId);

            if (dError) throw dError;
        } else {
            const { data: newRec, error: hError } = await supabase
                .from('receptions')
                .insert({
                    store_id: storeId,
                    profile_id: profileId,
                    document_number: document.documentNumber,
                    document_date: document.documentDate,
                    reception_date: document.receptionDate,
                    nir_number: document.nirNumber || null,
                    supplier_text: document.supplierText || null,
                    supplier_cui: document.supplierCui || null,
                    observations: document.observations || null,
                    total_value: totalValue,
                    status: 'draft'
                })
                .select()
                .single();

            if (hError) throw hError;
            activeId = newRec.id;
        }

        const itemsToInsert = lines.map(l => ({
            store_id: storeId,
            reception_id: activeId,
            product_id: l.productId,
            quantity: l.quantity,
            purchase_price: l.purchasePrice,
            sale_price_new: l.salePrice,
            vat_percent: l.vatPercent,
            batch_number: l.batchNumber || document.documentNumber,
            expiry_date: l.expiryDate || null
        }));

        const { error: iError } = await supabase
            .from('reception_items')
            .insert(itemsToInsert);

        if (iError) throw iError;

        return activeId!;
    },

    /**
     * Finalizează / postează o recepție draft în stoc (RPC atomic).
     */
    async postReception(receptionId: string, storeId: string, profileId: string): Promise<string> {
        const { data, error } = await supabase.rpc('post_reception', {
            p_reception_id: receptionId,
            p_store_id: storeId,
            p_profile_id: profileId
        });

        if (error) {
            console.error("RPC post_reception error:", error);
            throw new Error(error.message || "Eroare la confirmarea recepției.");
        }

        return data;
    },

    /**
     * Anulează o recepție în starea draft.
     */
    async cancelReception(receptionId: string, storeId: string): Promise<void> {
        const { error } = await supabase
            .from('receptions')
            .update({ status: 'cancelled' })
            .eq('id', receptionId)
            .eq('store_id', storeId);

        if (error) throw error;
    }
};
