/**
 * categoryService.ts
 * Serviciu pentru gestionarea categoriilor și subcategoriilor.
 * Schema: categories(id, store_id, name, parent_id, created_at)
 * Modelul self-referential: parent_id=null → root, parent_id!=null → subcategorie
 */

import { supabase } from '../../shared/supabase/supabaseClient';
import { CategoryRow, CategoryOption, CategoryWithSubs } from './types';

export const categoryService = {
    /**
     * Listează categoriile principale (root) ale unui magazin.
     */
    async listRootCategories(storeId: string): Promise<CategoryOption[]> {
        if (!storeId) return [];

        const { data, error } = await supabase
            .from('categories')
            .select('id, name, parent_id')
            .eq('store_id', storeId)
            .is('parent_id', null)
            .order('name', { ascending: true });

        if (error) {
            console.error('categoryService.listRootCategories error:', error);
            throw error;
        }

        return ((data ?? []) as any[]).map((r) => ({
            id: r.id as string,
            name: r.name as string,
            parentId: null
        }));
    },

    /**
     * Listează subcategoriile unei categorii principale.
     */
    async listSubcategories(storeId: string, parentId: string): Promise<CategoryOption[]> {
        if (!storeId || !parentId) return [];

        const { data, error } = await supabase
            .from('categories')
            .select('id, name, parent_id')
            .eq('store_id', storeId)
            .eq('parent_id', parentId)
            .order('name', { ascending: true });

        if (error) {
            console.error('categoryService.listSubcategories error:', error);
            throw error;
        }

        return ((data ?? []) as any[]).map((r) => ({
            id: r.id as string,
            name: r.name as string,
            parentId: r.parent_id as string | null
        }));
    },

    /**
     * Listează toate categoriile (principale + subcategorii) grupate ierarhic.
     * Util pentru POS category browser.
     */
    async listAllGrouped(storeId: string): Promise<CategoryWithSubs[]> {
        if (!storeId) return [];

        const { data, error } = await supabase
            .from('categories')
            .select('id, name, parent_id, store_id, created_at')
            .eq('store_id', storeId)
            .order('name', { ascending: true });

        if (error) {
            console.error('categoryService.listAllGrouped error:', error);
            throw error;
        }

        const rows: CategoryRow[] = data ?? [];
        const roots = rows.filter(r => r.parent_id === null);

        return roots.map(root => ({
            id: root.id,
            name: root.name,
            subcategories: rows
                .filter(r => r.parent_id === root.id)
                .map(sub => ({ id: sub.id, name: sub.name, parentId: sub.parent_id }))
        }));
    },

    /**
     * Creează o categorie principală.
     * Validare: fără duplicate (case-insensitive) în același magazin.
     */
    async createRootCategory(storeId: string, name: string): Promise<CategoryOption> {
        if (!storeId) throw new Error('Store ID lipsă.');
        const trimmed = name.trim();
        if (trimmed.length < 2) throw new Error('Numele categoriei trebuie să aibă minim 2 caractere.');

        // Verificăm duplicate (case-insensitive)
        const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('store_id', storeId)
            .is('parent_id', null)
            .ilike('name', trimmed)
            .maybeSingle();

        if (existing) {
            throw new Error(`Categoria "${trimmed}" există deja.`);
        }

        const { data, error } = await supabase
            .from('categories')
            .insert({ store_id: storeId, name: trimmed, parent_id: null })
            .select('id, name, parent_id')
            .single();

        if (error) throw error;
        if (!data) throw new Error('Categoria nu a putut fi creată.');

        return { id: data.id, name: data.name, parentId: null };
    },

    /**
     * Creează o subcategorie sub o categorie principală.
     * Validare: fără duplicate (case-insensitive) în aceeași categorie.
     */
    async createSubcategory(storeId: string, parentId: string, name: string): Promise<CategoryOption> {
        if (!storeId) throw new Error('Store ID lipsă.');
        if (!parentId) throw new Error('Categoria principală este obligatorie pentru a crea o subcategorie.');
        const trimmed = name.trim();
        if (trimmed.length < 2) throw new Error('Numele subcategoriei trebuie să aibă minim 2 caractere.');

        // Verificăm duplicate (case-insensitive) în aceeași categorie
        const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('store_id', storeId)
            .eq('parent_id', parentId)
            .ilike('name', trimmed)
            .maybeSingle();

        if (existing) {
            throw new Error(`Subcategoria "${trimmed}" există deja în această categorie.`);
        }

        const { data, error } = await supabase
            .from('categories')
            .insert({ store_id: storeId, name: trimmed, parent_id: parentId })
            .select('id, name, parent_id')
            .single();

        if (error) throw error;
        if (!data) throw new Error('Subcategoria nu a putut fi creată.');

        return { id: data.id, name: data.name, parentId: parentId };
    }
};
