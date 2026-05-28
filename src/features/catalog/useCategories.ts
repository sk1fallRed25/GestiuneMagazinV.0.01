/**
 * useCategories.ts
 * Hook pentru gestionarea categoriilor și subcategoriilor în Quick Add.
 */

import { useState, useEffect, useCallback } from 'react';
import { categoryService } from './categoryService';
import { CategoryOption } from './types';

interface UseCategoriesOptions {
    storeId: string | null;
}

export const useCategories = ({ storeId }: UseCategoriesOptions) => {
    const [rootCategories, setRootCategories] = useState<CategoryOption[]>([]);
    const [subcategories, setSubcategories] = useState<CategoryOption[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingSubcategories, setLoadingSubcategories] = useState(false);
    const [categoryError, setCategoryError] = useState<string | null>(null);

    // Încarcă categoriile principale la mount / schimbare magazin
    const loadRootCategories = useCallback(async () => {
        if (!storeId) {
            setRootCategories([]);
            return;
        }
        setLoadingCategories(true);
        setCategoryError(null);
        try {
            const cats = await categoryService.listRootCategories(storeId);
            setRootCategories(cats);
        } catch (err) {
            console.error('useCategories.loadRootCategories:', err);
            setCategoryError('Nu s-au putut încărca categoriile.');
        } finally {
            setLoadingCategories(false);
        }
    }, [storeId]);

    useEffect(() => {
        loadRootCategories();
    }, [loadRootCategories]);

    // Încarcă subcategoriile când se schimbă categoria principală
    const loadSubcategories = useCallback(async (parentId: string) => {
        if (!storeId || !parentId) {
            setSubcategories([]);
            return;
        }
        setLoadingSubcategories(true);
        try {
            const subs = await categoryService.listSubcategories(storeId, parentId);
            setSubcategories(subs);
        } catch (err) {
            console.error('useCategories.loadSubcategories:', err);
            setSubcategories([]);
        } finally {
            setLoadingSubcategories(false);
        }
    }, [storeId]);

    // Handler schimbare categorie principală
    const selectCategory = useCallback((categoryId: string) => {
        setSelectedCategoryId(categoryId);
        setSelectedSubcategoryId(''); // resetăm subcategoria
        if (categoryId) {
            loadSubcategories(categoryId);
        } else {
            setSubcategories([]);
        }
    }, [loadSubcategories]);

    // Handler schimbare subcategorie
    const selectSubcategory = useCallback((subcategoryId: string) => {
        setSelectedSubcategoryId(subcategoryId);
    }, []);

    // Creare categorie principală
    const createRootCategory = useCallback(async (name: string): Promise<CategoryOption | null> => {
        if (!storeId) return null;
        try {
            const newCat = await categoryService.createRootCategory(storeId, name);
            // Adaugă în lista locală și selectează automat
            setRootCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
            selectCategory(newCat.id);
            return newCat;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Eroare creare categorie.';
            throw new Error(msg);
        }
    }, [storeId, selectCategory]);

    // Creare subcategorie
    const createSubcategory = useCallback(async (name: string): Promise<CategoryOption | null> => {
        if (!storeId || !selectedCategoryId) {
            throw new Error('Selectează mai întâi o categorie principală.');
        }
        try {
            const newSub = await categoryService.createSubcategory(storeId, selectedCategoryId, name);
            // Adaugă în lista locală și selectează automat
            setSubcategories(prev => [...prev, newSub].sort((a, b) => a.name.localeCompare(b.name)));
            setSelectedSubcategoryId(newSub.id);
            return newSub;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Eroare creare subcategorie.';
            throw new Error(msg);
        }
    }, [storeId, selectedCategoryId]);

    // Reset total (la reset formular)
    const resetCategorySelection = useCallback(() => {
        setSelectedCategoryId('');
        setSelectedSubcategoryId('');
        setSubcategories([]);
    }, []);

    return {
        rootCategories,
        subcategories,
        selectedCategoryId,
        selectedSubcategoryId,
        loadingCategories,
        loadingSubcategories,
        categoryError,
        selectCategory,
        selectSubcategory,
        createRootCategory,
        createSubcategory,
        resetCategorySelection,
        reloadRootCategories: loadRootCategories
    };
};
