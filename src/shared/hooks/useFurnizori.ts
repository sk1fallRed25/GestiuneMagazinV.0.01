import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { toast } from 'react-hot-toast';

// Definirea tipurilor direct aici pentru a fi refolosibile
export interface Agent {
    id: number;
    nume: string;
    email: string;
}

export interface Furnizor {
    id: number;
    nume_firma: string;
    cui: string;
    adresa: string;
    agenti: Agent[];
}

export const useFurnizori = () => {
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFurnizori = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('furnizori')
            .select('*, agenti(*)')
            .order('nume_firma');
        
        if (error) {
            toast.error(error.message);
            setFurnizori([]);
        } else {
            setFurnizori(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchFurnizori();
    }, [fetchFurnizori]);

    const addFurnizor = async (furnizorData: Omit<Furnizor, 'id' | 'agenti'>) => {
        const promise = supabase.from('furnizori').insert(furnizorData).then();
        // @ts-ignore
        await toast.promise(promise, {
            loading: 'Se adaugă furnizorul...',
            success: 'Furnizor adăugat!',
            error: (err) => `Eroare: ${err.message}`
        });
        await fetchFurnizori();
    };

    const deleteFurnizor = async (furnizorId: number) => {
        const promise = supabase.from('furnizori').delete().eq('id', furnizorId).then();
        // @ts-ignore
        await toast.promise(promise, {
            loading: 'Se șterge furnizorul...',
            success: 'Furnizor șters!',
            error: (err) => `Eroare: ${err.message}`
        });
        await fetchFurnizori();
    };

    const addAgent = async (agentData: Omit<Agent, 'id'> & { parola: string, furnizor_id: number }) => {
        const promise = supabase.from('agenti').insert(agentData).then();
        // @ts-ignore
        await toast.promise(promise, {
            loading: 'Se adaugă agentul...',
            success: 'Agent adăugat!',
            error: (err) => `Eroare: ${err.message}`
        });
        await fetchFurnizori();
    };

    const deleteAgent = async (agentId: number) => {
        const promise = supabase.from('agenti').delete().eq('id', agentId).then();
        // @ts-ignore
        await toast.promise(promise, {
            loading: 'Se șterge agentul...',
            success: 'Agent șters!',
            error: (err) => `Eroare: ${err.message}`
        });
        await fetchFurnizori();
    };

    return {
        furnizori,
        loading,
        addFurnizor,
        deleteFurnizor,
        addAgent,
        deleteAgent
    };
};
