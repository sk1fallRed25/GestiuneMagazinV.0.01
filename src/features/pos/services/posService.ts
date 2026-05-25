import { supabase } from '../../../shared/supabase/supabaseClient';
import { 
    PosProduct, 
    CreateSalePayload, 
    StockBatch, 
    CashRegister, 
    ActiveShift, 
    OpenShiftPayload, 
    CloseShiftPayload, 
    ShiftCloseResult 
} from '../types';
import { normalizeSgrType } from '../../products/utils/sgr';

const toNumberStrict = (value: unknown, fieldName: string): number => {
    const n = Number(value);
    if (isNaN(n) || !isFinite(n)) {
        throw new Error(`Valoare numerică invalidă pentru ${fieldName}.`);
    }
    return n;
};

export const posService = {
    /**
     * Caută produse active în gestiune, incluzând preț și stoc magazin.
     */
    async searchProducts(storeId: string, query: string): Promise<PosProduct[]> {
        if (!storeId || query.length < 2) return [];

        // 1. Căutare produse
        const { data: products, error: pError } = await supabase
            .from('products')
            .select('id, name, barcode, unit, sgr_enabled, sgr_type')
            .eq('store_id', storeId)
            .eq('status', 'active')
            .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
            .limit(20);

        if (pError) throw pError;
        if (!products || products.length === 0) return [];

        const productIds = products.map(p => p.id);

        // 2. Citește prețuri filtrat după store_id
        const { data: prices, error: prError } = await supabase
            .from('product_prices')
            .select('product_id, price_sale, vat_percent')
            .eq('store_id', storeId)
            .in('product_id', productIds);

        if (prError) throw prError;

        // 3. Citește stoc magazin (sumă pe loturi)
        const { data: batches, error: bError } = await supabase
            .from('stock_batches')
            .select('product_id, quantity')
            .eq('store_id', storeId)
            .eq('zone', 'magazin')
            .gt('quantity', 0)
            .in('product_id', productIds);

        if (bError) throw bError;

        // Mapare rezultate
        return products.map(p => {
            const price = prices?.find(pr => pr.product_id === p.id);
            const productBatches = batches?.filter(b => b.product_id === p.id) || [];
            const stockMagazin = productBatches.reduce((acc, b) => acc + toNumberStrict(b.quantity, 'stoc lot'), 0);

            const sgrType = normalizeSgrType(p.sgr_type);
            const sgrEnabled = !!(p.sgr_enabled && sgrType !== null);
            console.log("searchProducts mapped item:", { name: p.name, sgr_enabled: p.sgr_enabled, sgr_type: p.sgr_type, sgrEnabled, sgrType });

            return {
                id: p.id,
                name: p.name,
                barcode: p.barcode,
                unit: p.unit,
                priceSale: price ? toNumberStrict(price.price_sale, 'preț vânzare') : 0,
                vatPercent: price ? toNumberStrict(price.vat_percent, 'TVA') : 19,
                stockMagazin,
                sgrEnabled,
                sgrType
            };
        });
    },

    /**
     * Caută un produs exact după cod de bare.
     */
    async getProductByBarcode(storeId: string, barcode: string): Promise<PosProduct | null> {
        if (!storeId || !barcode) return null;

        const { data: products, error: pError } = await supabase
            .from('products')
            .select('id, name, barcode, unit, sgr_enabled, sgr_type')
            .eq('store_id', storeId)
            .eq('barcode', barcode)
            .eq('status', 'active')
            .single();

        if (pError) {
            if (pError.code === 'PGRST116') return null; // Not found
            throw pError;
        }

        // Preț filtrat după store_id
        const { data: price, error: prError } = await supabase
            .from('product_prices')
            .select('price_sale, vat_percent')
            .eq('store_id', storeId)
            .eq('product_id', products.id)
            .maybeSingle();

        if (prError) throw prError;

        // Stoc magazin
        const { data: batches, error: bError } = await supabase
            .from('stock_batches')
            .select('quantity')
            .eq('store_id', storeId)
            .eq('zone', 'magazin')
            .gt('quantity', 0)
            .eq('product_id', products.id);

        if (bError) throw bError;

        const stockMagazin = (batches || []).reduce((acc, b) => acc + toNumberStrict(b.quantity, 'stoc lot'), 0);

        const sgrType = normalizeSgrType(products.sgr_type);
        const sgrEnabled = !!(products.sgr_enabled && sgrType !== null);
        console.log("getProductByBarcode mapped item:", { name: products.name, sgr_enabled: products.sgr_enabled, sgr_type: products.sgr_type, sgrEnabled, sgrType });

        return {
            id: products.id,
            name: products.name,
            barcode: products.barcode,
            unit: products.unit,
            priceSale: price ? toNumberStrict(price.price_sale, 'preț vânzare') : 0,
            vatPercent: price ? toNumberStrict(price.vat_percent, 'TVA') : 19,
            stockMagazin,
            sgrEnabled,
            sgrType
        };
    },

    /**
     * Finalizează o vânzare.
     */
    async createSale(payload: CreateSalePayload): Promise<string> {
        const { storeId, profileId, items, paymentMethod, cashAmount, cardAmount, shiftId } = payload;

        if (!storeId || !profileId || items.length === 0) {
            throw new Error("Date vânzare incomplete.");
        }

        // Validare items frontend și construire payload items pentru RPC
        let totalSaleUI = 0;
        const itemsForRpc: { product_id: string; quantity: number }[] = [];

        for (const item of items) {
            if (!item.productId || item.quantity <= 0 || item.price < 0) {
                throw new Error(`Produs invalid în coș: ${item.name || 'ID ' + item.productId}`);
            }
            const itemQty = toNumberStrict(item.quantity, `cantitate ${item.name}`);
            const itemPrice = toNumberStrict(item.price, `preț ${item.name}`);
            totalSaleUI += itemQty * itemPrice;

            itemsForRpc.push({
                product_id: item.productId,
                quantity: itemQty
            });
        }

        if (totalSaleUI <= 0) {
            throw new Error("Totalul vânzării trebuie să fie pozitiv.");
        }

        // Validare runtime paymentMethod și construire payload plăți pentru RPC
        const validMethods = ['cash', 'card', 'mixed'];
        if (!validMethods.includes(paymentMethod)) {
            throw new Error("Metodă de plată invalidă.");
        }

        const paymentsForRpc: { method: string; amount: number }[] = [];

        if (paymentMethod === 'mixed') {
            const cAmount = toNumberStrict(cashAmount || 0, 'sumă cash');
            const cdAmount = toNumberStrict(cardAmount || 0, 'sumă card');
            const paid = cAmount + cdAmount;
            
            if (Math.abs(paid - totalSaleUI) > 0.01) {
                throw new Error(`Suma plătită (${paid.toFixed(2)}) nu coincide cu totalul (${totalSaleUI.toFixed(2)}).`);
            }
            if (paid <= 0) {
                throw new Error("Suma plătită trebuie să fie pozitivă.");
            }
            if (cAmount > 0) paymentsForRpc.push({ method: 'cash', amount: cAmount });
            if (cdAmount > 0) paymentsForRpc.push({ method: 'card', amount: cdAmount });
        } else {
            paymentsForRpc.push({ method: paymentMethod, amount: totalSaleUI });
        }

        // Apelare RPC atomic
        const { data, error } = await supabase.rpc('finalize_sale', {
            p_store_id: storeId,
            p_profile_id: profileId,
            p_items: itemsForRpc,
            p_payments: paymentsForRpc,
            p_shift_id: shiftId || null
        });

        if (error) {
            console.error("RPC finalize_sale error:", error);
            const msg = error.message || "";
            if (msg.includes("tură activă este obligatorie") || msg.includes("nu este activă")) {
                throw new Error("O tură activă este obligatorie pentru a finaliza vânzarea. Deschide tura înainte de a vinde.");
            }
            if (msg.includes("Stoc insuficient")) {
                throw new Error("Stoc insuficient pentru finalizarea vânzării.");
            }
            if (msg.includes("Acces refuzat") || msg.includes("Acces interzis") || msg.includes("permisiuni")) {
                throw new Error("Acces refuzat pentru finalizarea vânzării.");
            }
            if (msg.includes("Plăți") || msg.includes("plată") || msg.includes("total")) {
                throw new Error("Totalul plății nu corespunde cu prețurile actuale. Reîncarcă produsele și încearcă din nou.");
            }
            if (msg.includes("preț") || msg.includes("pret") || msg.includes("price")) {
                throw new Error("Prețul produsului nu este configurat corect.");
            }
            throw new Error(msg || "Vânzarea nu a putut fi finalizată.");
        }

        type FinalizeSaleRpcResult = {
          sale_id?: unknown;
          total?: unknown;
        };

        const result = data as FinalizeSaleRpcResult | string | null;

        if (typeof result === 'string') {
          if (!result.trim()) throw new Error("Vânzarea nu a putut fi finalizată.");
          return result;
        }

        if (result && typeof result === 'object' && typeof result.sale_id === 'string') {
          return result.sale_id;
        }

        throw new Error("Vânzarea nu a putut fi finalizată.");
    },

    /**
     * Încarcă lista de case de marcat din magazinul activ.
     */
    async listCashRegisters(storeId: string): Promise<CashRegister[]> {
        if (!storeId) return [];
        const { data, error } = await supabase
            .from('cash_registers')
            .select('id, store_id, name, code, active')
            .eq('store_id', storeId)
            .eq('active', true)
            .order('name');

        if (error) {
            console.error("listCashRegisters error:", error);
            throw new Error("Nu s-au putut încărca casele de marcat.");
        }

        return (data || []).map(r => ({
            id: r.id,
            storeId: r.store_id,
            name: r.name,
            code: r.code,
            active: r.active
        }));
    },

    /**
     * Încarcă tura activă a utilizatorului din magazin.
     */
    async getActiveShift(storeId: string, profileId: string): Promise<ActiveShift | null> {
        if (!storeId || !profileId) return null;
        const { data, error } = await supabase.rpc('get_active_pos_shift', {
            p_store_id: storeId,
            p_profile_id: profileId
        });

        if (error) {
            console.error("getActiveShift error:", error);
            throw new Error("Nu s-a putut încărca tura activă.");
        }

        if (!data) return null;

        type RpcShiftResult = {
            shift_id?: string;
            status?: string;
            opening_cash?: number;
            opened_at?: string;
            cash_register_id?: string | null;
            cash_register_name?: string | null;
            current_totals?: {
                total_sales?: number;
                total_cash?: number;
                total_card?: number;
                total_mixed?: number;
                expected_cash?: number;
                transactions_count?: number;
            };
        };

        const res = data as RpcShiftResult;
        if (!res.shift_id) return null;

        const currentTotals = res.current_totals || {};

        return {
            shiftId: res.shift_id,
            status: (res.status as 'open' | 'closed' | 'cancelled') || 'open',
            openingCash: toNumberStrict(res.opening_cash ?? 0, 'sold deschidere'),
            openedAt: res.opened_at || new Date().toISOString(),
            cashRegisterId: res.cash_register_id || null,
            cashRegisterName: res.cash_register_name || null,
            currentTotals: {
                totalSales: toNumberStrict(currentTotals.total_sales ?? 0, 'total vânzări'),
                totalCash: toNumberStrict(currentTotals.total_cash ?? 0, 'total cash'),
                totalCard: toNumberStrict(currentTotals.total_card ?? 0, 'total card'),
                totalMixed: toNumberStrict(currentTotals.total_mixed ?? 0, 'total mixt'),
                expectedCash: toNumberStrict(currentTotals.expected_cash ?? 0, 'numerar așteptat'),
                transactionsCount: toNumberStrict(currentTotals.transactions_count ?? 0, 'număr tranzacții')
            }
        };
    },

    /**
     * Deschide o tură nouă.
     */
    async openShift(payload: OpenShiftPayload): Promise<string> {
        const { storeId, profileId, cashRegisterId, openingCash, notes } = payload;
        if (!storeId || !profileId) {
            throw new Error("Date incomplete pentru deschiderea turei.");
        }
        const oCash = toNumberStrict(openingCash, 'sold inițial');
        if (oCash < 0) {
            throw new Error("Suma inițială nu poate fi negativă.");
        }

        const { data, error } = await supabase.rpc('open_pos_shift', {
            p_store_id: storeId,
            p_profile_id: profileId,
            p_cash_register_id: cashRegisterId || null,
            p_opening_cash: oCash,
            p_notes: notes || null
        });

        if (error) {
            console.error("openShift error:", error);
            const msg = error.message || "";
            if (msg.includes("deja o tură deschisă")) {
                throw new Error("Ai deja o tură deschisă în acest magazin.");
            }
            if (msg.includes("deja o tură deschisă de către alt")) {
                throw new Error("Casa de marcat este deja folosită de alt utilizator.");
            }
            throw new Error("Nu s-a putut deschide tura.");
        }

        if (typeof data === 'string' && data.trim()) {
            return data;
        }

        throw new Error("Nu s-a putut deschide tura.");
    },

    /**
     * Închide tura activă.
     */
    async closeShift(payload: CloseShiftPayload): Promise<ShiftCloseResult> {
        const { storeId, profileId, shiftId, declaredCash, closingNotes } = payload;
        if (!storeId || !profileId || !shiftId) {
            throw new Error("Date incomplete pentru închiderea turei.");
        }
        const dCash = toNumberStrict(declaredCash, 'numerar faptic declarat');
        if (dCash < 0) {
            throw new Error("Numerarul declarat nu poate fi negativ.");
        }

        const { data, error } = await supabase.rpc('close_pos_shift', {
            p_store_id: storeId,
            p_profile_id: profileId,
            p_shift_id: shiftId,
            p_declared_cash: dCash,
            p_closing_notes: closingNotes || null
        });

        if (error) {
            console.error("closeShift error:", error);
            throw new Error("Nu s-a putut închide tura.");
        }

        type RpcCloseResult = {
            shift_id?: string;
            status?: string;
            closed_at?: string;
            summary?: {
                opening_cash?: number;
                total_sales?: number;
                total_cash?: number;
                total_card?: number;
                total_mixed?: number;
                expected_cash?: number;
                declared_cash?: number;
                cash_difference?: number;
                transactions_count?: number;
            };
        };

        const res = data as RpcCloseResult;
        if (!res || !res.shift_id) {
            throw new Error("Nu s-a putut închide tura.");
        }

        const summary = res.summary || {};

        return {
            shiftId: res.shift_id,
            status: res.status || 'closed',
            closedAt: res.closed_at || new Date().toISOString(),
            summary: {
                openingCash: toNumberStrict(summary.opening_cash ?? 0, 'sold deschidere'),
                totalSales: toNumberStrict(summary.total_sales ?? 0, 'total vânzări'),
                totalCash: toNumberStrict(summary.total_cash ?? 0, 'total cash'),
                totalCard: toNumberStrict(summary.total_card ?? 0, 'total card'),
                totalMixed: toNumberStrict(summary.total_mixed ?? 0, 'total mixt'),
                expectedCash: toNumberStrict(summary.expected_cash ?? 0, 'numerar așteptat'),
                declaredCash: toNumberStrict(summary.declared_cash ?? 0, 'numerar declarat'),
                cashDifference: toNumberStrict(summary.cash_difference ?? 0, 'diferență de casă'),
                transactionsCount: toNumberStrict(summary.transactions_count ?? 0, 'număr tranzacții')
            }
        };
    },

    /**
     * Anulează o tură deschisă din greșeală (fără vânzări).
     */
    async cancelShift(storeId: string, profileId: string, shiftId: string, notes?: string): Promise<string> {
        if (!storeId || !profileId || !shiftId) {
            throw new Error("Date incomplete pentru anularea turei.");
        }

        const { data, error } = await supabase.rpc('cancel_pos_shift', {
            p_store_id: storeId,
            p_profile_id: profileId,
            p_shift_id: shiftId,
            p_notes: notes || null
        });

        if (error) {
            console.error("cancelShift error:", error);
            const msg = error.message || "";
            if (msg.includes("are deja vânzări")) {
                throw new Error("Tura nu poate fi anulată deoarece are deja vânzări înregistrate.");
            }
            throw new Error("Nu s-a putut anula tura.");
        }

        if (typeof data === 'string' && data.trim()) {
            return data;
        }

        throw new Error("Nu s-a putut anula tura.");
    }
};
