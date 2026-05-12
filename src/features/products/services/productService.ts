import { supabase } from '../../../shared/supabase/supabaseClient';
import { Product, ProductUpdateInput } from '../types';

export const productService = {
    async listProducts(): Promise<Product[]> {
        const { data, error } = await supabase
            .from('produse')
            .select('*')
            .order('nume', { ascending: true });

        if (error) throw error;
        
        // Mapăm unitate_masura la um pentru compatibilitate cu UI-ul existent
        return (data || []).map((p: Record<string, any>) => ({
            ...p,
            um: p.unitate_masura || p.um || ''
        })) as Product[];
    },

    async updateProduct(productId: number, input: ProductUpdateInput): Promise<void> {
        // Ne asigurăm că trimitem unitate_masura către DB dacă um a fost modificat în UI
        const { um, ...rest } = input;
        const updateData: Record<string, any> = { ...rest };
        
        if (um) {
            updateData.unitate_masura = um;
        }

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
