import React, { useState, useMemo } from 'react';
import { Database, RefreshCw, AlertCircle, Sparkles, X, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useProducts } from './hooks/useProducts';
import { Product } from './types';
import ProductSearchBar from './components/ProductSearchBar';
import ProductTable from './components/ProductTable';
import ProductEditModal from './components/ProductEditModal';


const ProductsPage = () => {
    const { role } = useAuth();
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
        vatConfig
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

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        await deleteProduct(id);
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center text-gray-500 font-medium">
            <RefreshCw className="animate-spin mr-3 text-indigo-600" />
            Se accesează serverul de baze de date...
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
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen bg-slate-50/30">
            {/* Header Secțiune */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <Database size={28} />
                        </span>
                        Monitorizare Stocuri & Produse
                    </h1>
                    <p className="text-gray-500 mt-2 ml-1 text-sm italic">
                        Sincronizare în timp real (Schema v2). Rol: <span className="font-bold text-indigo-600 uppercase">{userRole || 'Nedefinit'}</span>
                    </p>
                </div>
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
                                        ? 'text-orange-950'
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

            {/* Bara de Căutare */}
            <ProductSearchBar value={searchTerm} onChange={setSearchTerm} />

            {/* Tabel Central */}
            <ProductTable 
                products={finalFilteredProducts} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                userRole={userRole}
                vatConfig={vatConfig}
                emptyStateDescription={emptyStateMessage}
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
        </div>
    );
};

export default ProductsPage;
