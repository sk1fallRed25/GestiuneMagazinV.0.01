import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Product, ProductUpdateInput } from '../types';
import { productService } from '../services/productService';

export const useProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await productService.listProducts();
            setProducts(data);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Eroare necunoscută la sincronizare";
            toast.error("Eroare la sincronizarea stocului: " + message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.cod_bare && p.cod_bare.includes(searchTerm))
        );
    }, [products, searchTerm]);

    const updateProduct = async (productId: number, input: ProductUpdateInput) => {
        try {
            const promise = productService.updateProduct(productId, input);
            
            await toast.promise(promise, {
                loading: 'Se procesează actualizarea...',
                success: 'Datele produsului au fost modificate.',
                error: (err: Error) => `Eroare SQL: ${err.message}`
            });

            await fetchProducts();
        } catch (error: unknown) {
            console.error("Update error:", error);
        }
    };

    const deleteProduct = async (productId: number) => {
        try {
            const promise = productService.deleteProductUnsafe(productId);
            
            await toast.promise(promise, {
                loading: 'Se elimină produsul...',
                success: 'Produs eliminat cu succes.',
                error: (err: Error) => `Eroare la ștergere: ${err.message}`
            });

            await fetchProducts();
        } catch (error: unknown) {
            console.error("Delete error:", error);
        }
    };

    return {
        products,
        loading,
        searchTerm,
        setSearchTerm,
        filteredProducts,
        refreshProducts: fetchProducts,
        updateProduct,
        deleteProduct
    };
};
