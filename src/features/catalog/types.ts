/**
 * Tipuri pentru sistemul de categorii/subcategorii
 * Schema live: categories(id, store_id, name, parent_id, created_at)
 * Modelul: parent_id IS NULL → categorie principală
 *          parent_id IS NOT NULL → subcategorie
 */

export interface CategoryRow {
    id: string;
    store_id: string;
    name: string;
    parent_id: string | null;
    created_at: string;
}

/** Opțiune simplificată pentru dropdown-uri */
export interface CategoryOption {
    id: string;
    name: string;
    parentId: string | null;
}

/** Categorie principală cu subcategoriile ei */
export interface CategoryWithSubs {
    id: string;
    name: string;
    subcategories: CategoryOption[];
}

/** Categoria "General" implicită (nu există în DB, e fallback UI) */
export const GENERAL_CATEGORY_SENTINEL = '__GENERAL__';
