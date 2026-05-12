// src/services/deliveryService.ts

import { supabase } from '../../config/supabase';

// Interfață pentru un produs de pe factura de intrare
export interface DeliveryItem {
    produs_id: number;
    cantitate: number;
    pret_achizitie: number;
}

// Funcția principală: Salvează recepția și crește stocul
export const createDelivery = async (distribuitorId: number, items: DeliveryItem[]) => {
    // 1. Calculăm totalul facturii
    const totalValoare = items.reduce((sum, item) => sum + (item.cantitate * item.pret_achizitie), 0);

    // 2. Creăm Livrarea (Antetul)
    const { data: livrareData, error: livrareError } = await supabase
        .from('livrari')
        .insert([{
            distribuitor_id: distribuitorId,
            total_valoare: totalValoare,
            data_livrare: new Date()
        }])
        .select()
        .single();

    if (livrareError) throw livrareError;

    const livrareId = livrareData.id;

    // 3. Adăugăm fiecare produs în detalii_livrare și actualizăm stocul
    // Facem asta pe rând pentru siguranță
    for (const item of items) {
        // A. Salvăm linia în istoric
        const { error: detailError } = await supabase
            .from('detalii_livrare')
            .insert([{
                livrare_id: livrareId,
                produs_id: item.produs_id,
                cantitate: item.cantitate,
                pret_achizitie: item.pret_achizitie
            }]);

        if (detailError) {
            console.error("Eroare la salvare detaliu:", detailError);
            throw detailError;
        }

        // B. ACTUALIZĂM STOCUL (Partea Magică 🪄)
        // Luăm stocul curent
        const { data: produsCurent } = await supabase
            .from('produse')
            .select('stoc')
            .eq('id', item.produs_id)
            .single();

        if (produsCurent) {
            // Scriem noul stoc
            await supabase
                .from('produse')
                .update({ stoc: produsCurent.stoc + item.cantitate })
                .eq('id', item.produs_id);
        }
    }

    return livrareId;
};

// Funcție simplă pentru a vedea istoricul livrărilor
export const fetchDeliveries = async () => {
    // Luăm livrările și numele distribuitorului (join)
    const { data, error } = await supabase
        .from('livrari')
        .select(`
        *,
        utilizatori ( nume ) 
      `)
        .order('data_livrare', { ascending: false });

    if (error) throw error;
    return data;
};
