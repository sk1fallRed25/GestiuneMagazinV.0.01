import { supabase } from '../../config/supabase';

export interface Shift {
    id: number;
    user_id: number;
    data_inceput: string;
    data_sfarsit: string;
    status: string;
    utilizatori?: { nume: string; email: string }; // Pentru a afișa numele angajatului
}

// 1. Citește toate turele (inclusiv numele angajatului)
export const fetchShifts = async (): Promise<Shift[]> => {
    const { data, error } = await supabase
        .from('ture')
        .select(`
      *,
      utilizatori ( nume, email )
    `)
        .order('data_inceput', { ascending: true });

    if (error) {
        console.error('Eroare la citirea turelor:', error);
        return [];
    }
    return data || [];
};

// 2. Adaugă o tură nouă
export const addShift = async (shift: { user_id: number, data_inceput: string, data_sfarsit: string }) => {
    const { data, error } = await supabase
        .from('ture')
        .insert([shift])
        .select();

    if (error) throw error;
    return data;
};

// 3. Șterge o tură
export const deleteShift = async (id: number) => {
    const { error } = await supabase
        .from('ture')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
