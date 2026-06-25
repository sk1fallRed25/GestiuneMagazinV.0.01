import React, { useState, useMemo, useEffect } from 'react';
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
import { PageHeader, LoadingState, ConfirmModal } from '../../shared/components/ui';

const ProductsSkeleton = () => {
    return (
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen bg-slate-50/30 space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center mb-8">
                <div className="space-y-2">
                    <div className="h-8 bg-slate-200 rounded-xl w-64" />
                    <div className="h-4 bg-slate-200 rounded-lg w-96" />
                </div>
                <div className="h-10 bg-slate-200 rounded-xl w-48" />
            </div>

            {/* Search and Filters Skeletons */}
            <div className="h-16 bg-white rounded-2xl border border-slate-300 w-full" />
            <div className="h-16 bg-white rounded-2xl border border-slate-300 w-full" />

            {/* Table Skeleton */}
            <div className="bg-white rounded-3xl border border-slate-300 overflow-hidden shadow-sm">
                <div className="h-12 bg-slate-100 border-b border-slate-200" />
                <div className="p-4 space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-2">
                            <div className="h-4 bg-slate-200 rounded w-1/4" />
                            <div className="h-4 bg-slate-200 rounded w-12" />
                            <div className="h-4 bg-slate-200 rounded w-16" />
                            <div className="h-4 bg-slate-200 rounded w-20" />
                            <div className="h-8 bg-slate-200 rounded w-24" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

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
        // Categories addition
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
    const [currentPage, setCurrentPage] = useState(1);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, categoryFilter, subcategoryFilter, activeAiFilter]);

    const totalPages = Math.ceil(finalFilteredProducts.length / ITEMS_PER_PAGE);

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return finalFilteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [finalFilteredProducts, currentPage]);

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsEditModalOpen(true);
    };

    const handleDelete = (id: string) => {
        const prod = products.find(p => p.id === id);
        if (prod) {
            setProductToDelete(prod);
        }
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

    if (loading) return <ProductsSkeleton />;

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
                        activeAiFilter === 'no_stock' 
                            ? 'from-red-50/80 to-red-100/10 border-red-200 dark:border-red-950/30' 
                            : activeAiFilter === 'low_stock'
                            ? 'from-orange-50/80 to-orange-100/10 border-orange-200 dark:border-orange-950/30'
                            : 'from-indigo-50/80 to-indigo-100/10 border-indigo-200 dark:border-indigo-950/30'
                    }`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                            activeAiFilter === 'no_stock' 
                                ? 'bg-red-50 border-red-100 text-red-600' 
                                : activeAiFilter === 'low_stock'
                                ? 'bg-orange-50 border-orange-100 text-orange-600'
                                : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                        }`}>
                            <Sparkles size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider border ${
                                    activeAiFilter === 'no_stock' 
                                        ? 'bg-red-100/50 border-red-200 text-red-700' 
                                        : activeAiFilter === 'low_stock'
                                        ? 'bg-orange-100/50 border-orange-200 text-orange-700'
                                        : 'bg-indigo-100/50 border-indigo-200 text-indigo-700'
                                }`}>
                                    FILTRU AI
                                </span>
                                <h3 className={`text-base font-black tracking-tight ${
                                    activeAiFilter === 'no_stock' 
                                        ? 'text-red-950' 
                                        : activeAiFilter === 'low_stock'
                                        ? 'text-orange-955'
                                        : 'text-indigo-955'
                                }`}>
                                    {activeAiFilter === 'low_stock' && (
                                        <span data-testid="products-ai-filter-low-stock">Filtru AI activ: Stoc scăzut</span>
                                    )}
                                    {activeAiFilter === 'no_stock' && (
                                        <span data-testid="products-ai-filter-no-stock">Filtru AI activ: Produse epuizate</span>
                                    )}
                                    {activeAiFilter === 'dead_stock' && (
                                        <span data-testid="products-ai-filter-dead-stock">Filtru AI activ: Produse fără vânzare</span>
                                    )}
                                </h3>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed max-w-2xl">
                                {activeAiFilter === 'low_stock' && 'Se afișează produsele active cu stocul total cuprins între 1 și 5 bucăți (sub pragul de siguranță).'}
                                {activeAiFilter === 'no_stock' && 'Se afișează produsele active cu stocul total egal cu 0.'}
                                {activeAiFilter === 'dead_stock' && 'Filtrul Dead Stock necesită conectarea cu datele AI. Momentan vezi lista generală de produse.'}
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
                                activeAiFilter === 'no_stock'
                                    ? 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                                    : activeAiFilter === 'low_stock'
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
                products={paginatedProducts} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                userRole={userRole}
                vatConfig={vatConfig}
                emptyStateDescription={emptyStateMessage}
                categoriesTree={categoriesTree}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
            />

            {/* Pagination Controls */}
            {finalFilteredProducts.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white px-6 py-4 rounded-3xl border border-slate-300 shadow-sm animate-in fade-in duration-200">
                    <div className="text-xs font-semibold text-slate-500">
                        Se afișează <span className="font-bold text-slate-800">{Math.min(finalFilteredProducts.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> - <span className="font-bold text-slate-800">{Math.min(finalFilteredProducts.length, currentPage * ITEMS_PER_PAGE)}</span> din <span className="font-bold text-slate-800">{finalFilteredProducts.length}</span> produse
                    </div>
                    
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-sm"
                            >
                                Anterior
                            </button>
                            
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalPages }).map((_, idx) => {
                                    const pageNum = idx + 1;
                                    if (
                                        totalPages > 7 &&
                                        pageNum !== 1 &&
                                        pageNum !== totalPages &&
                                        Math.abs(pageNum - currentPage) > 1
                                    ) {
                                        if (pageNum === 2 && currentPage > 3) {
                                            return <span key="dots-start" className="text-slate-400 px-1 text-xs">...</span>;
                                        }
                                        if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                                            return <span key="dots-end" className="text-slate-400 px-1 text-xs">...</span>;
                                        }
                                        return null;
                                    }
                                    
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                                currentPage === pageNum
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-sm"
                            >
                                Următor
                            </button>
                        </div>
                    )}
                </div>
            )}

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

            {/* Confirmare Arhivare Produs */}
            <ConfirmModal
                open={!!productToDelete}
                title="Arhivare Produs"
                message={`Sigur doriți să arhivați produsul "${productToDelete?.nume || ''}"? Această acțiune va elimina produsul din catalog și nu poate fi anulată.`}
                confirmText="Arhivează"
                cancelText="Anulează"
                variant="danger"
                onConfirm={async () => {
                    if (productToDelete) {
                        await deleteProduct(productToDelete.id);
                        setProductToDelete(null);
                    }
                }}
                onCancel={() => setProductToDelete(null)}
            />
        </div>
    );
};

export default ProductsPage;
