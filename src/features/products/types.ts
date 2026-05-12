export interface Product {
    id: number;
    nume: string;
    cod_bare: string;
    pret_vanzare: number;
    stoc_depozit: number;
    stoc_magazin: number;
    um: string;             // Folosit în Produse.tsx (Legacy/UI)
    unitate_masura: string; // Folosit în Vanzare.tsx / FastAdd.tsx (DB Real)
    active?: boolean;
    deleted_at?: string | null;
}

export type ProductUpdateInput = Partial<Omit<Product, 'id'>>;

export interface ProductsPageProps {
    userRole?: string;
}
