import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Product, ProductUpdateInput, ProductVatConfig } from '../types';
import { productService } from '../services/productService';
import { useAuth } from '../../auth/useAuth';

export const useProducts = () => {
    const { currentStoreId, user, role } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [vatConfig, setVatConfig] = useState<ProductVatConfig | null>(null);
    const [vatLoading, setVatLoading] = useState(false);

    const fetchProducts = useCallback(async () => {
        if (!currentStoreId) {
            setProducts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await productService.listProducts(currentStoreId);
            setProducts(data);
        } catch (error: unknown) {
            toast.error("Nu s-au putut încărca datele.");
        } finally {
            setLoading(false);
        }
    }, [currentStoreId]);

    const fetchVatConfig = useCallback(async () => {
        if (!currentStoreId) {
            setVatConfig(null);
            return;
        }
        setVatLoading(true);
        try {
            const config = await productService.getProductVatConfig(currentStoreId);
            setVatConfig(config);
        } catch (error) {
            console.error("Eroare la încărcarea configurației TVA:", error);
        } finally {
            setVatLoading(false);
        }
    }, [currentStoreId]);

    useEffect(() => {
        fetchProducts();
        fetchVatConfig();
    }, [fetchProducts, fetchVatConfig]);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.cod_bare && p.cod_bare.includes(searchTerm))
        );
    }, [products, searchTerm]);

    const updateProduct = async (productId: string, input: ProductUpdateInput) => {
        if (!navigator.onLine) {
            toast.error("Nu poți modifica produse cât timp aplicația este offline.");
            return;
        }
        if (!currentStoreId) {
            toast.error(role === 'platform_owner' 
                ? "Selectează un magazin pentru a vedea produsele." 
                : "Magazinul curent nu este selectat.");
            return;
        }

        try {
            const promise = productService.updateProduct(currentStoreId, productId, input, user?.id);
            
            await toast.promise(promise, {
                loading: 'Se procesează actualizarea...',
                success: 'Datele produsului au fost modificate.',
                error: (err: unknown) => {
                    const message = err instanceof Error ? err.message : "Operațiunea nu a putut fi finalizată.";
                    return message;
                }
            });

            await fetchProducts();
        } catch (error: unknown) {
            console.error("Update error:", error);
        }
    };

    const deleteProduct = async (productId: string) => {
        if (!navigator.onLine) {
            toast.error("Nu poți modifica produse cât timp aplicația este offline.");
            return;
        }
        if (!currentStoreId) {
            toast.error("Magazinul curent nu este selectat.");
            return;
        }

        if (!window.confirm("Confirmi ștergerea (arhivarea) acestui produs?")) {
            return;
        }

        try {
            const promise = productService.archiveProduct(currentStoreId, productId);
            
            await toast.promise(promise, {
                loading: 'Se elimină produsul...',
                success: 'Produs eliminat cu succes.',
                error: (err: unknown) => {
                    const message = err instanceof Error ? err.message : "Operațiunea nu a putut fi finalizată.";
                    return message;
                }
            });

            await fetchProducts();
        } catch (error: unknown) {
            console.error("Delete error:", error);
        }
    };

    return {
        products,
        loading: loading || vatLoading,
        searchTerm,
        setSearchTerm,
        filteredProducts,
        refreshProducts: fetchProducts,
        updateProduct,
        deleteProduct,
        currentStoreId,
        vatConfig
    };
};
