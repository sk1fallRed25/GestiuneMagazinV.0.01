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
            const err = error as Error;
            toast.error("Eroare la sincronizarea stocului: " + err.message);
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
        const promise = productService.updateProduct(productId, input);
        
        await toast.promise(promise, {
            loading: 'Se procesează actualizarea...',
            success: 'Datele produsului au fost modificate.',
            error: (err: Error) => `Eroare SQL: ${err.message}`
        });

        await fetchProducts();
    };

    const deleteProduct = async (productId: number) => {
        const promise = productService.deleteProductUnsafe(productId);
        
        await toast.promise(promise, {
            loading: 'Se elimină produsul...',
            success: 'Produs eliminat cu succes.',
            error: (err: Error) => `Eroare la ștergere: ${err.message}`
        });

        await fetchProducts();
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
