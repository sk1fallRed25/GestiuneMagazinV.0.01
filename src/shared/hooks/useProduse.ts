import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { toast } from 'react-hot-toast';

// Reutilizăm tipurile definite
export interface Produs {
    id: number;
    nume: string;
    cod_bare: string;
    unitate_masura: string;
    pret_vanzare_fara_tva: number;
    tva_procent: number;
    pret_achizitie: number;
    stoc_depozit: number;
    stoc_magazin: number;
    stoc_minim_depozit: number;
    stoc_minim_magazin: number;
    prag_optim: number;
    furnizor_id: number | null;
    sales_velocity?: number;
}

export const useProduse = (userRole: string) => {
    const [produse, setProduse] = useState<Produs[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProduse = useCallback(async () => {
        setLoading(true);
        const { data: produseData, error } = await supabase.from('produse').select('*').order('nume', { ascending: true });
        
        if (error) {
            toast.error(error.message);
            setProduse([]);
            setLoading(false);
            return;
        }

        if (produseData && userRole === 'admin') {
            const produseCuViteza = await Promise.all(produseData.map(async (p) => {
                const { data: velocity } = await supabase.rpc('get_sales_velocity', { p_produs_id: p.id });
                return { ...p, sales_velocity: velocity || 0 };
            }));
            setProduse(produseCuViteza as Produs[]);
        } else {
            setProduse(produseData as Produs[] || []);
        }
        setLoading(false);
    }, [userRole]);

    useEffect(() => {
        fetchProduse();
    }, [fetchProduse]);

    const addProdus = async (produsData: Omit<Produs, 'id'>) => {
        const promise = supabase.from('produse').insert([produsData]).then();
        // @ts-ignore
        await toast.promise(promise, {
            loading: 'Se adaugă produsul...',
            success: 'Produs adăugat!',
            error: (err) => `Eroare: ${err.message}`
        });
        await fetchProduse();
    };

    const updateProdus = async (produsId: number, produsData: Omit<Produs, 'id'>) => {
        const promise = supabase.from('produse').update(produsData).eq('id', produsId).then();
        // @ts-ignore
        await toast.promise(promise, {
            loading: 'Se modifică produsul...',
            success: 'Produs modificat!',
            error: (err) => `Eroare: ${err.message}`
        });
        await fetchProduse();
    };

    const deleteProdus = async (produsId: number) => {
        const promise = supabase.from('produse').delete().eq('id', produsId).then();
        // @ts-ignore
        await toast.promise(promise, {
            loading: 'Se șterge produsul...',
            success: 'Produs șters!',
            error: (err) => `Eroare: ${err.message}`
        });
        await fetchProduse();
    };

    return {
        produse,
        loading,
        addProdus,
        updateProdus,
        deleteProdus
    };
};
