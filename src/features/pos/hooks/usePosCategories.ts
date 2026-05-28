/**
 * usePosCategories.ts
 * Hook pentru browsing-ul categorii/subcategorii/produse în POS.
 */

import { useState, useEffect, useCallback } from 'react';
import { categoryService } from '../../catalog/categoryService';
import { CategoryWithSubs } from '../../catalog/types';
import { PosProduct } from '../types';

interface UsePosCategoriesOptions {
    storeId: string | null;
    allProducts: PosProduct[];   // toate produsele deja încărcate
}

export const usePosCategories = ({ storeId, allProducts }: UsePosCategoriesOptions) => {
    const [categoriesTree, setCategoriesTree] = useState<CategoryWithSubs[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);

    // Încarcă toate categoriile la mount
    const loadCategories = useCallback(async () => {
        if (!storeId) {
            setCategoriesTree([]);
            return;
        }
        setLoadingCategories(true);
        try {
            const tree = await categoryService.listAllGrouped(storeId);
            setCategoriesTree(tree);
        } catch (err) {
            console.error('usePosCategories.loadCategories error:', err);
        } finally {
            setLoadingCategories(false);
        }
    }, [storeId]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    // Produsele ce trebuie afișate în browser (filtrare după categoria/subcategoria activă)
    // products.category_id poate fi: null, un root-category-id, sau un subcategory-id
    const browseProducts = (() => {
        if (!activeCategoryId) return [];

        const activeCategory = categoriesTree.find(c => c.id === activeCategoryId);
        if (!activeCategory) return [];

        if (activeSubcategoryId) {
            // Arată produsele din subcategoria selectată
            return allProducts.filter(p => (p as any).categoryId === activeSubcategoryId);
        }

        // Arată produsele din categoria principală SAU din oricare din subcategoriile ei
        const subIds = new Set(activeCategory.subcategories.map(s => s.id));
        return allProducts.filter(p => {
            const catId = (p as any).categoryId;
            return catId === activeCategoryId || subIds.has(catId);
        });
    })();

    const selectCategory = (categoryId: string | null) => {
        setActiveCategoryId(categoryId);
        setActiveSubcategoryId(null);
    };

    const selectSubcategory = (subcategoryId: string | null) => {
        setActiveSubcategoryId(subcategoryId);
    };

    const resetBrowse = () => {
        setActiveCategoryId(null);
        setActiveSubcategoryId(null);
    };

    const activeCategory = categoriesTree.find(c => c.id === activeCategoryId) ?? null;
    const activeSubcategories = activeCategory?.subcategories ?? [];

    return {
        categoriesTree,
        loadingCategories,
        activeCategoryId,
        activeSubcategoryId,
        activeCategory,
        activeSubcategories,
        browseProducts,
        selectCategory,
        selectSubcategory,
        resetBrowse,
        reloadCategories: loadCategories
    };
};
