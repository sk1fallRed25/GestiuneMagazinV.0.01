import { supabase } from '../../../shared/supabase/supabaseClient';
import { LossProduct, CreateLossPayload } from '../types';

export const lossService = {
    /**
     * Obține lista de produse pentru raportare pierderi
     */
    async listLossProducts(): Promise<LossProduct[]> {
        const { data, error } = await supabase
            .from('produse')
            .select('id, nume, cod_bare, stoc_depozit, stoc_magazin')
            .order('nume');

        if (error) throw error;
        return (data || []) as LossProduct[];
    },

    /**
     * Înregistrează o pierdere și actualizează stocul.
     * 
     * IMPORTANT: Această operațiune nu este atomică în prezent. 
     * Trebuie mutată într-un RPC 'scrap_stock' pentru a asigura integritatea datelor (tranzacție).
     */
    async createLossAndUpdateStock(payload: CreateLossPayload): Promise<void> {
        // 1. Înregistrare pierdere
        const { error: logError } = await supabase
            .from('pierderi')
            .insert([{
                produs_id: payload.produs_id,
                user_id: payload.user_id,
                cantitate: payload.cantitate,
                motiv: payload.motiv,
                sursa_stoc: payload.sursa_stoc
            }]);

        if (logError) throw logError;

        // 2. Actualizare stocuri în tabela produse
        const { error: updateError } = await supabase
            .from('produse')
            .update({
                stoc_magazin: payload.new_stoc_magazin,
                stoc_depozit: payload.new_stoc_depozit
            })
            .eq('id', payload.produs_id);

        if (updateError) throw updateError;
    }
};
