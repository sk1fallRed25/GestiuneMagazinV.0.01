import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Product, ProductUpdateInput, ProductVatConfig } from '../types';
import { productService } from '../services/productService';
import { useAuth } from '../../auth/useAuth';
import { categoryService } from '../../catalog/categoryService';
import { CategoryWithSubs } from '../../catalog/types';
import { FILTER_UNCATEGORIZED, FILTER_NO_SUBCATEGORY } from '../components/ProductSearchBar';

export const useProducts = () => {
    const { currentStoreId, user, role } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [vatConfig, setVatConfig] = useState<ProductVatConfig | null>(null);
    const [vatLoading, setVatLoading] = useState(false);

    // Category filter state
    const [categoriesTree, setCategoriesTree] = useState<CategoryWithSubs[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [subcategoryFilter, setSubcategoryFilter] = useState('');

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

    const fetchCategories = useCallback(async () => {
        if (!currentStoreId) {
            setCategoriesTree([]);
            return;
        }
        setCategoriesLoading(true);
        try {
            const tree = await categoryService.listAllGrouped(currentStoreId);
            setCategoriesTree(tree);
        } catch (error) {
            console.error("Eroare la încărcarea categoriilor:", error);
        } finally {
            setCategoriesLoading(false);
        }
    }, [currentStoreId]);

    useEffect(() => {
        fetchProducts();
        fetchVatConfig();
        fetchCategories();
    }, [fetchProducts, fetchVatConfig, fetchCategories]);

    /**
     * Filtrare produse: text + categorie + subcategorie
     */
    const filteredProducts = useMemo(() => {
        let result = products;

        // Text filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(p =>
                p.nume.toLowerCase().includes(lowerSearch) ||
                (p.cod_bare && p.cod_bare.includes(searchTerm))
            );
        }

        // Category filter
        if (categoryFilter) {
            if (categoryFilter === FILTER_UNCATEGORIZED) {
                // Products without any category
                result = result.filter(p => !p.category_id);
            } else {
                // Products in this category or its subcategories
                const selectedCat = categoriesTree.find(c => c.id === categoryFilter);
                if (selectedCat) {
                    const validIds = new Set<string>();
                    validIds.add(selectedCat.id);
                    selectedCat.subcategories.forEach(sub => validIds.add(sub.id));

                    result = result.filter(p => p.category_id && validIds.has(p.category_id));
                }
            }
        }

        // Subcategory filter
        if (subcategoryFilter && categoryFilter && categoryFilter !== FILTER_UNCATEGORIZED) {
            if (subcategoryFilter === FILTER_NO_SUBCATEGORY) {
                // Products directly in the main category (category_id = root category id)
                result = result.filter(p => p.category_id === categoryFilter);
            } else {
                // Products in the specific subcategory
                result = result.filter(p => p.category_id === subcategoryFilter);
            }
        }

        return result;
    }, [products, searchTerm, categoryFilter, subcategoryFilter, categoriesTree]);

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
                success: '✓ Produs salvat',
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

        if (!window.confirm("Ești sigur? Această operație nu poate fi anulată. Confirmi ștergerea (arhivarea) acestui produs?")) {
            return;
        }

        try {
            const promise = productService.archiveProduct(currentStoreId, productId);

            await toast.promise(promise, {
                loading: 'Se elimină produsul...',
                success: '✓ Produs eliminat',
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
        loading: loading || vatLoading || categoriesLoading,
        searchTerm,
        setSearchTerm,
        filteredProducts,
        refreshProducts: fetchProducts,
        updateProduct,
        deleteProduct,
        currentStoreId,
        vatConfig,
        // Category state
        categoriesTree,
        categoryFilter,
        setCategoryFilter,
        subcategoryFilter,
        setSubcategoryFilter,
        reloadCategories: fetchCategories
    };
};
