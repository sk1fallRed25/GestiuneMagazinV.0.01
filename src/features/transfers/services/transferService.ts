import { supabase } from '../../../shared/supabase/supabaseClient';
import { TransferProduct, CreateTransferPayload } from '../types';

export const transferService = {
    /**
     * Obține lista de produse pentru transfer
     */
    async listTransferProducts(): Promise<TransferProduct[]> {
        const { data, error } = await supabase
            .from('produse')
            .select('id, nume, stoc_depozit, stoc_magazin, cod_bare')
            .order('nume');

        if (error) throw error;
        return (data || []) as TransferProduct[];
    },

    /**
     * Obține stocul actual pentru un produs (re-verificare critică)
     */
    async getCurrentStock(productId: number): Promise<{ stoc_depozit: number; stoc_magazin: number }> {
        const { data, error } = await supabase
            .from('produse')
            .select('stoc_depozit, stoc_magazin')
            .eq('id', productId)
            .single();

        if (error || !data) throw new Error("Nu s-a putut verifica stocul actual.");
        return data;
    },

    /**
     * Actualizează stocurile pentru transfer.
     * 
     * IMPORTANT: Această operațiune nu este atomică în prezent.
     * Trebuie mutată într-un RPC 'transfer_stock' pentru a asigura integritatea datelor (tranzacție).
     */
    async updateTransferStock(payload: CreateTransferPayload): Promise<void> {
        const { error } = await supabase
            .from('produse')
            .update({
                stoc_depozit: payload.nou_stoc_depozit,
                stoc_magazin: payload.nou_stoc_magazin
            })
            .eq('id', payload.produs_id);

        if (error) throw error;
    }
};
