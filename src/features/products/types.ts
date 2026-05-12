export interface Product {
    id: number;
    nume: string;
    cod_bare: string;
    pret_vanzare: number;
    stoc_depozit: number;
    stoc_magazin: number;
    um: string;             // Folosit în UI (Legacy/Frontend)
    unitate_masura: string; // Folosit în DB Real
    active?: boolean;
    deleted_at?: string | null;
}

/**
 * Reprezentarea exactă a unui rând din tabela 'produse' în Supabase.
 */
export interface ProductDbRow {
    id: number;
    nume: string;
    cod_bare: string;
    pret_vanzare: number;
    stoc_depozit: number;
    stoc_magazin: number;
    unitate_masura: string;
    active?: boolean;
    deleted_at?: string | null;
    created_at?: string;
    categorie_principala?: string;
    categorie_secundara?: string;
}

/**
 * Tipul de date trimis către Supabase pentru update.
 * Exclude câmpurile de UI (um) și câmpurile protejate (id).
 */
export type ProductUpdateDbInput = Partial<Omit<ProductDbRow, 'id' | 'created_at'>>;

export type ProductUpdateInput = Partial<Omit<Product, 'id'>>;

export interface ProductsPageProps {
    userRole?: string;
}
