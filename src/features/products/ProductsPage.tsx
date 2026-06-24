import React, { useState, useMemo } from 'react';
import { Database, RefreshCw, AlertCircle, Sparkles, X, ArrowLeft, FolderOpen, ArrowRightCircle } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useNetworkStatus } from '../../shared/network/useNetworkStatus';
import { useAuth } from '../auth/useAuth';
import { useProducts } from './hooks/useProducts';
import { Product } from './types';
import ProductSearchBar from './components/ProductSearchBar';
import ProductTable from './components/ProductTable';
import ProductEditModal from './components/ProductEditModal';
import CategoryManagerModal from './components/CategoryManagerModal';
import BulkMoveCategoryModal from './components/BulkMoveCategoryModal';
import { PageHeader, LoadingState } from '../../shared/components/ui';

const ProductsPage = () => {
    const { role } = useAuth();
    const { isOnline } = useNetworkStatus();
    const userRole = role || undefined;
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Priority: query param > location.state
    const queryFilter = searchParams.get('aiFilter');
    const stateFilter = location.state?.aiFilter;
    const activeAiFilter = queryFilter || stateFilter || null;

    const {
        loading,
        searchTerm,
        setSearchTerm,
        filteredProducts,
        updateProduct,
        deleteProduct,
        currentStoreId,
        vatConfig,
        categoriesTree,
        categoryFilter,
        setCategoryFilter,
        subcategoryFilter,
        setSubcategoryFilter,
        reloadCategories,
        products,
        refreshProducts
    } = useProducts();

    const handleClearFilter = () => {
        navigate('/produse', { replace: true, state: {} });
    };

    const finalFilteredProducts = useMemo(() => {
        if (!activeAiFilter) return filteredProducts;
        
        return filteredProducts.filter(p => {
            const totalStock = (p.stoc_depozit || 0) + (p.stoc_magazin || 0);
            if (activeAiFilter === 'low_stock') {
                return totalStock > 0 && totalStock <= 5;
            }
            if (activeAiFilter === 'no_stock') {
                return totalStock === 0;
            }
            if (activeAiFilter === 'dead_stock') {
                return true; // Fallback
            }
            return true;
        });
    }, [filteredProducts, activeAiFilter]);

    const emptyStateMessage = useMemo(() => {
        if (!activeAiFilter) return undefined;
        if (activeAiFilter === 'low_stock') return 'Nu există produse cu stoc scăzut.';
        if (activeAiFilter === 'no_stock') return 'Nu există produse epuizate.';
        if (activeAiFilter === 'dead_stock') return 'Nu există produse fără vânzare în perioada analizată.';
        return undefined;
    }, [activeAiFilter]);

    // Modals & Selection state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        await deleteProduct(id);
    };

    // Selection handlers
    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        setSelectedIds(prev => {
            const allSelected = finalFilteredProducts.length > 0 && finalFilteredProducts.every(p => prev.has(p.id));
            if (allSelected) {
                return new Set();
            } else {
                return new Set(finalFilteredProducts.map(p => p.id));
            }
        });
    };

    const handleBulkMoveSuccess = () => {
        setSelectedIds(new Set());
        refreshProducts();
        reloadCategories();
    };

    const handleCloseCategoryManager = () => {
        setIsCategoryManagerOpen(false);
        reloadCategories();
        refreshProducts();
    };

    // Get selected product names for the bulk move summary
    const selectedProductNames = useMemo(() => {
        return products
            .filter(p => selectedIds.has(p.id))
            .map(p => p.nume);
    }, [products, selectedIds]);

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50/50">
            <LoadingState message="Se accesează serverul de baze de date..." size="lg" />
        </div>
    );

    if (!currentStoreId) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <AlertCircle size={64} className="text-orange-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Magazin neselectat</h2>
                <p className="text-gray-500 mt-2 max-w-md">
                    Pentru a vedea și gestiona produsele, vă rugăm să selectați un magazin activ din meniul de profil.
                </p>
            </div>
        );
    }

    return (
        <div data-testid="products-page" className="p-8 max-w-[1400px] mx-auto min-h-screen bg-slate-50/30">
            {/* Offline Warning Banner */}
            {!isOnline && (
                <div data-testid="products-offline-warning-banner" className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-3xl text-amber-800 text-sm font-semibold flex items-center gap-3">
                    <span>⚠️</span>
                    <span>Datele afișate pot fi neactualizate. Reconectează aplicația pentru operațiuni de stoc.</span>
                </div>
            )}

            {/* Header Secțiune */}
            <div data-testid="products-page-header">
                <PageHeader
                    title="Monitorizare Stocuri & Produse"
                    description={`Sincronizare în timp real (Schema v2). Rol: ${userRole || 'Nedefinit'}`}
                    icon={<Database size={24} />}
                    actions={
                        <div className="flex items-center gap-3">
                            <button
                                data-testid="catalog-category-manager-button"
                                onClick={() => setIsCategoryManagerOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                            >
                                <FolderOpen size={14} />
                                Gestionează Categorii
                            </button>
                            {!isOnline && (
                                <span data-testid="products-offline-badge" className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
                                    Date posibil neactualizate
                                </span>
                            )}
                        </div>
                    }
                />
            </div>

            {/* Banner Filtru AI */}
            {activeAiFilter && (
                <div 
                    data-testid="products-ai-filter-banner"
                    className={`mb-6 p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-br transition-all duration-300 ${
                        ['no_stock', 'critical_stock'].includes(activeAiFilter) 
                            ? 'from-red-50/80 to-red-100/10 border-red-200 dark:border-red-950/30' 
                            : activeAiFilter === 'low_stock' || activeAiFilter === 'no_price'
                            ? 'from-orange-50/80 to-orange-100/10 border-orange-200 dark:border-orange-950/30'
                            : 'from-indigo-50/80 to-indigo-100/10 border-indigo-200 dark:border-indigo-950/30'
                    }`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                            ['no_stock', 'critical_stock'].includes(activeAiFilter) 
                                ? 'bg-red-50 border-red-100 text-red-600' 
                                : activeAiFilter === 'low_stock' || activeAiFilter === 'no_price'
                                ? 'bg-orange-50 border-orange-100 text-orange-600'
                                : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                        }`}>
                            <Sparkles size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider border ${
                                    ['no_stock', 'critical_stock'].includes(activeAiFilter) 
                                        ? 'bg-red-100/50 border-red-200 text-red-700' 
                                        : activeAiFilter === 'low_stock' || activeAiFilter === 'no_price'
                                        ? 'bg-orange-100/50 border-orange-200 text-orange-700'
                                        : 'bg-indigo-100/50 border-indigo-200 text-indigo-700'
                                }`}>
                                    FILTRU INTELIGENT
                                </span>
                                <h3 className={`text-base font-black tracking-tight ${
                                    ['no_stock', 'critical_stock'].includes(activeAiFilter) 
                                        ? 'text-red-950' 
                                        : activeAiFilter === 'low_stock' || activeAiFilter === 'no_price'
                                        ? 'text-orange-955'
                                        : 'text-indigo-955'
                                }`}>
                                    {activeAiFilter === 'low_stock' && 'Filtru activ: Stoc scăzut (1-5 buc)'}
                                    {activeAiFilter === 'critical_stock' && 'Filtru activ: Stoc critic (<= 5 buc)'}
                                    {activeAiFilter === 'no_stock' && 'Filtru activ: Produse epuizate (0 buc)'}
                                    {activeAiFilter === 'no_price' && 'Filtru activ: Produse fără preț'}
                                    {activeAiFilter === 'no_category' && 'Filtru activ: Produse fără categorie'}
                                    {activeAiFilter === 'no_vat' && 'Filtru activ: Fără TVA configurat'}
                                    {activeAiFilter === 'no_supplier' && 'Filtru activ: Fără furnizor asociat'}
                                    {activeAiFilter === 'dead_stock' && 'Filtru activ: Produse fără vânzare'}
                                </h3>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed max-w-2xl">
                                {activeAiFilter === 'low_stock' && 'Se afișează produsele active cu stocul total cuprins între 1 și 5 bucăți.'}
                                {activeAiFilter === 'critical_stock' && 'Se afișează produsele active cu stocul total critic (0-5 bucăți).'}
                                {activeAiFilter === 'no_stock' && 'Se afișează produsele active cu stocul total egal cu 0.'}
                                {activeAiFilter === 'no_price' && 'Se afișează produsele active care nu au preț de vânzare definit.'}
                                {activeAiFilter === 'no_category' && 'Se afișează produsele active care nu sunt asociate niciunei categorii.'}
                                {activeAiFilter === 'no_vat' && 'Se afișează produsele active care nu au cotă sau grupă TVA configurată.'}
                                {activeAiFilter === 'no_supplier' && 'Se afișează produsele active care nu au fost niciodată recepționate de la un furnizor.'}
                                {activeAiFilter === 'dead_stock' && 'Se afișează produsele fără rotație sau vânzări în ultimele 30 de zile.'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
                        <button
                            data-testid="products-ai-filter-back-ai"
                            onClick={() => navigate('/ai-consultant')}
                            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
                        >
                            <ArrowLeft size={14} />
                            AI Consultant
                        </button>
                        <button
                            data-testid="products-ai-filter-clear"
                            onClick={handleClearFilter}
                            className={`px-4 py-2 text-xs font-bold rounded-xl border shadow-sm transition-all flex items-center gap-1.5 ${
                                ['no_stock', 'critical_stock'].includes(activeAiFilter)
                                    ? 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                                    : activeAiFilter === 'low_stock' || activeAiFilter === 'no_price'
                                    ? 'bg-orange-600 text-white hover:bg-orange-700 border-orange-600'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600'
                            }`}
                        >
                            <X size={14} />
                            Elimină filtrul
                        </button>
                    </div>
                </div>
            )}

            {/* Bara de Căutare și Filtre Categorie */}
            <ProductSearchBar 
                value={searchTerm} 
                onChange={setSearchTerm} 
                categories={categoriesTree}
                selectedCategoryId={categoryFilter}
                onCategoryChange={setCategoryFilter}
                selectedSubcategoryId={subcategoryFilter}
                onSubcategoryChange={setSubcategoryFilter}
            />

            <div className="flex justify-between items-center mb-4 mt-2 px-1">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {finalFilteredProducts.length} {finalFilteredProducts.length === 1 ? 'produs găsit' : 'produse găsite'}
                </span>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div 
                    data-testid="products-bulk-actions-bar"
                    className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in duration-200"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                            <FolderOpen size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-indigo-950">
                                {selectedIds.size} {selectedIds.size === 1 ? 'produs selectat' : 'produse selectate'}
                            </h4>
                            <p className="text-xs text-slate-500 font-semibold">
                                Alege o acțiune colectivă pentru produsele selectate.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            data-testid="bulk-move-products-category-trigger"
                            onClick={() => setIsBulkMoveOpen(true)}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                            <ArrowRightCircle size={14} />
                            Mută în categorie
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all"
                        >
                            Anulează selecția
                        </button>
                    </div>
                </div>
            )}

            {/* Tabel Central */}
            <ProductTable 
                products={finalFilteredProducts} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                userRole={userRole}
                vatConfig={vatConfig}
                emptyStateDescription={emptyStateMessage}
                categoriesTree={categoriesTree}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                searchTerm={searchTerm}
            />

            {/* Modal Editare */}
            <ProductEditModal 
                product={editingProduct}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={updateProduct}
                vatConfig={vatConfig}
                storeId={currentStoreId}
            />

            {/* Category Manager Modal */}
            <CategoryManagerModal
                open={isCategoryManagerOpen}
                onClose={handleCloseCategoryManager}
                storeId={currentStoreId}
                products={products}
            />

            {/* Bulk Move Modal */}
            <BulkMoveCategoryModal
                open={isBulkMoveOpen}
                onClose={() => setIsBulkMoveOpen(false)}
                storeId={currentStoreId}
                selectedProductIds={Array.from(selectedIds)}
                selectedProductNames={selectedProductNames}
                onSuccess={handleBulkMoveSuccess}
            />
        </div>
    );
};

export default ProductsPage;
