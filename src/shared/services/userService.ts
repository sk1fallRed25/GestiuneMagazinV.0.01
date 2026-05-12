// src/services/userService.ts

import { supabase } from '../../config/supabase';
import { User } from '../types';

// Citire toți utilizatorii
export const fetchUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('utilizatori')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error('Eroare la preluarea utilizatorilor:', error);
        return [];
    }
    return data || [];
};

// Adăugare utilizator nou
export const addUser = async (user: Omit<User, 'id' | 'data_inregistrare'>) => {
    const { data, error } = await supabase
        .from('utilizatori')
        .insert([user])
        .select();

    if (error) throw error;
    return data;
};

// Ștergere utilizator
export const deleteUser = async (id: number) => {
    const { error } = await supabase
        .from('utilizatori')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
// ... codul existent ...

// FUNCȚIE NOUĂ: Găsește userul după PIN
export const getUserByPin = async (pin: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('utilizatori')
        .select('*')
        .eq('pin', pin)
        .limit(1); // <--- AICI E SCHIMBAREA: Luăm doar unul, nu forțăm unicitatea

    if (error) {
        console.error("Eroare verificare PIN:", error);
        return null;
    }

    // Dacă lista e goală sau nu există data
    if (!data || data.length === 0) {
        return null;
    }

    // Returnăm primul utilizator găsit
    return data[0];
};
