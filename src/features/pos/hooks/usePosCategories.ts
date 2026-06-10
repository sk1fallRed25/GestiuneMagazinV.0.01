/**
 * usePosCategories.ts
 * Hook pentru browsing-ul categorii/subcategorii/produse în POS.
 */

import { useState, useEffect, useCallback } from 'react';
import { categoryService } from '../../catalog/categoryService';
import { CategoryWithSubs } from '../../catalog/types';
import { PosProduct } from '../types';

// Case-insensitive ID comparison helpers
export const normalizeId = (val: any): string | null => {
    if (val === null || val === undefined) return null;
    const s = String(val).trim().toLowerCase();
    return s || null;
};

export const sameId = (a: any, b: any): boolean => {
    const normA = normalizeId(a);
    const normB = normalizeId(b);
    if (!normA || !normB) return false;
    return normA === normB;
};

export const includesId = (arr: any[], id: any): boolean => {
    if (!Array.isArray(arr)) return false;
    const normId = normalizeId(id);
    if (!normId) return false;
    return arr.some(x => normalizeId(x) === normId);
};

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

        const activeCategory = categoriesTree.find(c => sameId(c.id, activeCategoryId));
        if (!activeCategory) return [];

        // Helper defensiv pentru extragerea tuturor ID-urilor posibile de categorii dintr-un produs
        const getProductCategoryIds = (p: any): { categoryId: string | null; subcategoryId: string | null; allIds: string[] } => {
            const categoryId = p.categoryId || p.category_id || null;
            const subcategoryId = p.subcategoryId || p.subcategory_id || null;
            
            let allIds: string[] = [];
            
            const rawIds = p.categoryIds || p.category_ids || p.categoryPath || p.category_path || null;
            if (Array.isArray(rawIds)) {
                allIds = rawIds.map(String);
            } else if (typeof rawIds === 'string') {
                try {
                    const parsed = JSON.parse(rawIds);
                    if (Array.isArray(parsed)) {
                        allIds = parsed.map(String);
                    } else {
                        allIds = [rawIds];
                    }
                } catch {
                    allIds = rawIds.split(/[\s,;/]+/).filter(Boolean);
                }
            }

            if (categoryId && !includesId(allIds, categoryId)) {
                allIds.push(categoryId);
            }
            if (subcategoryId && !includesId(allIds, subcategoryId)) {
                allIds.push(subcategoryId);
            }

            return { categoryId, subcategoryId, allIds };
        };

        if (activeSubcategoryId) {
            // Arată produsele din subcategoria selectată
            return allProducts.filter(p => {
                const { categoryId, subcategoryId, allIds } = getProductCategoryIds(p);
                
                // 1. Direct subcategory ID match (case-insensitive)
                if (sameId(subcategoryId, activeSubcategoryId)) return true;
                
                // 2. Category ID match (dacă category_id ține ID-ul subcategoriei, case-insensitive)
                if (sameId(categoryId, activeSubcategoryId)) return true;
                
                // 3. Includere în path/vectori (case-insensitive)
                if (includesId(allIds, activeSubcategoryId)) return true;
                
                // 4. Fallback pe numele subcategoriei
                const subName = activeCategory.subcategories.find(s => sameId(s.id, activeSubcategoryId))?.name;
                if (subName) {
                    const pCatName = (p as any).categoryName || (p as any).category_name || null;
                    if (pCatName && String(pCatName).trim().toLowerCase() === subName.trim().toLowerCase()) {
                        return true;
                    }
                }
                
                return false;
            });
        }

        // Arată produsele din categoria principală SAU din oricare din subcategoriile ei
        const subIds = activeCategory.subcategories.map(s => s.id);
        const activeCategoryName = activeCategory.name;
        const subNames = new Set(activeCategory.subcategories.map(s => s.name.trim().toLowerCase()));

        return allProducts.filter(p => {
            const { categoryId, subcategoryId, allIds } = getProductCategoryIds(p);
            
            // 1. Direct parent category match
            if (sameId(categoryId, activeCategoryId) || includesId(allIds, activeCategoryId)) return true;
            
            // 2. Subcategory match by ID
            if (subcategoryId && subIds.some(id => sameId(subcategoryId, id))) return true;
            if (categoryId && subIds.some(id => sameId(categoryId, id))) return true;
            if (allIds.some(id => subIds.some(subId => sameId(id, subId)))) return true;
            
            // 3. Fallback pe nume
            const pCatName = (p as any).categoryName || (p as any).category_name || null;
            if (pCatName) {
                const cleanName = String(pCatName).trim().toLowerCase();
                if (cleanName === activeCategoryName.trim().toLowerCase() || subNames.has(cleanName)) {
                    return true;
                }
            }
            
            return false;
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

    const activeCategory = categoriesTree.find(c => sameId(c.id, activeCategoryId)) ?? null;
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
