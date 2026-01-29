// src/services/salesService.ts
import { supabase } from '../config/supabase';

export interface SaleItem {
    produs_id: number;
    cantitate: number;
    pret_vanzare: number;
    numeProdus?: string;
}

// 1. PROCESARE VÂNZARE (Funcția care lipsea)
export const processSale = async (userId: number, items: SaleItem[], total: number, metodaPlata: string) => {
    // A. Creăm Bonul
    const { data: saleData, error: saleError } = await supabase
        .from('vanzari')
        .insert([{
            user_id: userId,
            total: total,
            metoda_plata: metodaPlata
        }])
        .select()
        .single();

    if (saleError) throw saleError;
    const saleId = saleData.id;

    // B. Adăugăm produsele și scădem stocul
    for (const item of items) {
        // Salvăm linia pe bon
        await supabase.from('detalii_vanzare').insert([{
            vanzare_id: saleId,
            produs_id: item.produs_id,
            cantitate: item.cantitate,
            pret_vanzare: item.pret_vanzare
        }]);

        // SCĂDEM STOCUL
        const { data: produsCurent } = await supabase
            .from('produse')
            .select('stoc')
            .eq('id', item.produs_id)
            .single();

        if (produsCurent) {
            await supabase
                .from('produse')
                .update({ stoc: produsCurent.stoc - item.cantitate })
                .eq('id', item.produs_id);
        }
    }

    return saleId;
};

// 2. ISTORIC VÂNZĂRI
export const fetchSalesHistory = async () => {
    const { data, error } = await supabase
        .from('vanzari')
        .select(`
            *,
            utilizatori ( nume ),
            detalii_vanzare (
                id,
                produs_id,
                cantitate,
                cantitate_returnata,
                pret_vanzare,
                produse ( nume )
            )
        `)
        .order('data_vanzare', { ascending: false });

    if (error) throw error;
    return data || [];
};

// 3. RETUR PARȚIAL PRODUS
export const refundProduct = async (detailId: number, produsId: number, cantitateDeReturnat: number) => {
    // A. Verificăm cât s-a returnat deja
    const { data: detaliu } = await supabase
        .from('detalii_vanzare')
        .select('cantitate, cantitate_returnata')
        .eq('id', detailId)
        .single();

    if (!detaliu) throw new Error("Linia de vânzare nu a fost găsită!");

    const ramase = detaliu.cantitate - detaliu.cantitate_returnata;
    if (cantitateDeReturnat > ramase) {
        throw new Error(`Poți returna maxim ${ramase} bucăți!`);
    }

    // B. Actualizăm linia de vânzare
    const { error: updateError } = await supabase
        .from('detalii_vanzare')
        .update({ cantitate_returnata: detaliu.cantitate_returnata + cantitateDeReturnat })
        .eq('id', detailId);

    if (updateError) throw updateError;

    // C. REFACEM STOCUL (Punem produsele înapoi pe raft)
    const { data: produs } = await supabase.from('produse').select('stoc').eq('id', produsId).single();
    if (produs) {
        await supabase
            .from('produse')
            .update({ stoc: produs.stoc + cantitateDeReturnat })
            .eq('id', produsId);
    }
};