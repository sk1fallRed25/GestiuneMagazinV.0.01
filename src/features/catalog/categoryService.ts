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
        const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI?.sqlite?.getCategories;
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        const loadOffline = async () => {
            if (isDesktop) {
                try {
                    const rows = await (window as any).electronAPI.sqlite.getCategories();
                    const roots = rows.filter((r: any) => !r.parent_id);
                    return roots.map((root: any) => ({
                        id: root.id,
                        name: root.name,
                        subcategories: rows
                            .filter((r: any) => r.parent_id === root.id)
                            .map((sub: any) => ({ id: sub.id, name: sub.name, parentId: sub.parent_id }))
                    }));
                } catch (err) {
                    console.error('[categoryService] listAllGrouped offline fallback error:', err);
                }
            }
            return [];
        };

        if (isDesktop && !isOnline) {
            console.log('[categoryService] Offline mode: loading categories from SQLite cache');
            return loadOffline();
        }

        if (!storeId) return [];

        try {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name, parent_id, store_id, created_at')
                .eq('store_id', storeId)
                .order('name', { ascending: true });

            if (error) {
                console.error('categoryService.listAllGrouped error, falling back:', error);
                if (isDesktop) return loadOffline();
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
        } catch (err) {
            console.error('categoryService.listAllGrouped failed, trying offline fallback:', err);
            if (isDesktop) return loadOffline();
            throw err;
        }
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
    },

    /**
     * Redenumește o categorie sau subcategorie.
     * Validare: fără duplicate (case-insensitive) la același nivel.
     */
    async updateCategoryName(storeId: string, categoryId: string, newName: string, parentId: string | null): Promise<void> {
        if (!storeId || !categoryId) throw new Error('Store ID și Category ID sunt obligatorii.');
        const trimmed = newName.trim();
        if (trimmed.length < 2) throw new Error('Numele categoriei trebuie să aibă minim 2 caractere.');

        // Verificăm duplicate la același nivel (case-insensitive)
        let query = supabase
            .from('categories')
            .select('id')
            .eq('store_id', storeId)
            .ilike('name', trimmed)
            .neq('id', categoryId);

        if (parentId === null) {
            query = query.is('parent_id', null);
        } else {
            query = query.eq('parent_id', parentId);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            throw new Error(`O categorie cu numele "${trimmed}" există deja la acest nivel.`);
        }

        const { error } = await supabase
            .from('categories')
            .update({ name: trimmed })
            .eq('id', categoryId)
            .eq('store_id', storeId);

        if (error) throw error;
    },

    /**
     * Returnează un map categoryId → număr de produse pentru un magazin.
     */
    async getProductCountPerCategory(storeId: string): Promise<Record<string, number>> {
        if (!storeId) return {};

        const { data, error } = await supabase
            .from('products')
            .select('category_id')
            .eq('store_id', storeId)
            .neq('status', 'deleted');

        if (error) {
            console.error('categoryService.getProductCountPerCategory error:', error);
            return {};
        }

        const counts: Record<string, number> = {};
        for (const row of (data ?? [])) {
            const catId = (row as any).category_id;
            if (catId) {
                counts[catId] = (counts[catId] || 0) + 1;
            }
        }
        return counts;
    }
};
