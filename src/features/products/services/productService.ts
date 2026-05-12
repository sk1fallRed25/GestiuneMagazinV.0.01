import { supabase } from '../../../shared/supabase/supabaseClient';
import { Product, ProductUpdateInput, ProductDbRow, ProductUpdateDbInput } from '../types';

export const productService = {
    async listProducts(): Promise<Product[]> {
        const { data, error } = await supabase
            .from('produse')
            .select('*')
            .order('nume', { ascending: true });

        if (error) throw error;
        
        // Mapăm datele din DB către interfața de UI (Product)
        const rows = (data || []) as ProductDbRow[];
        
        return rows.map((p) => ({
            ...p,
            um: p.unitate_masura || '' // UI folosește 'um'
        }));
    },

    async updateProduct(productId: number, input: ProductUpdateInput): Promise<void> {
        // Extragem 'um' pentru a-l mapa la 'unitate_masura' și eliminăm orice alte câmpuri de UI/inutile
        const { um, ...rest } = input;
        
        // Construim obiectul de update pentru DB folosind tipul strict
        const updateData: ProductUpdateDbInput = { ...rest };
        
        if (um !== undefined) {
            updateData.unitate_masura = um;
        }

        // Eliminăm câmpul 'unitate_masura' din rest dacă exista deja (pentru a evita dubluri/confuzii)
        // dar în tipul ProductUpdateInput ambele pot exista. Prioritizăm ce vine din UI ca 'um'.
        
        const { error } = await supabase
            .from('produse')
            .update(updateData)
            .eq('id', productId);

        if (error) throw error;
    },

    async deleteProductUnsafe(productId: number): Promise<void> {
        const { error } = await supabase
            .from('produse')
            .delete()
            .eq('id', productId);

        if (error) throw error;
    }
};
