/**
 * PosCategoryBrowser.tsx
 * Browser ierarhic categorii → subcategorii → produse pentru POS.
 * Apare când casierul nu caută activ (query = '').
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Tag, Package, ChevronLeft, Layers } from 'lucide-react';
import { CategoryWithSubs, CategoryOption } from '../../catalog/types';
import { PosProduct } from '../types';
import { useAuth } from '../../auth/useAuth';
import { sameId } from '../hooks/usePosCategories';

interface PosCategoryBrowserProps {
    categoriesTree: CategoryWithSubs[];
    activeSubcategories: CategoryOption[];
    browseProducts: PosProduct[];
    activeCategoryId: string | null;
    activeSubcategoryId: string | null;
    loadingCategories: boolean;
    onSelectCategory: (id: string | null) => void;
    onSelectSubcategory: (id: string | null) => void;
    onSelectProduct: (p: PosProduct) => void;
}

export const PosCategoryBrowser: React.FC<PosCategoryBrowserProps> = ({
    categoriesTree,
    activeSubcategories,
    browseProducts,
    activeCategoryId,
    activeSubcategoryId,
    loadingCategories,
    onSelectCategory,
    onSelectSubcategory,
    onSelectProduct
}) => {
    const { role } = useAuth();
    const isAdminOrManager = role === 'admin' || role === 'manager' || role === 'platform_owner';
    const activeCategory = categoriesTree.find(c => sameId(c.id, activeCategoryId)) ?? null;

    // ── Stare loading ──
    if (loadingCategories) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-400">
                <Layers size={28} className="animate-pulse mr-2" />
                <span className="text-sm font-bold">Se încarcă categoriile...</span>
            </div>
        );
    }

    // ── Nicio categorie ──
    if (categoriesTree.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300 gap-2">
                <FolderOpen size={44} className="opacity-30" />
                <p className="text-sm font-bold text-gray-400">Nicio categorie creată</p>
                <p className="text-xs text-gray-300">Adaugă categorii din „Adăugare Rapidă"</p>
            </div>
        );
    }

    // ── View: produse din subcategorie selectată ──
    if (activeSubcategoryId) {
        const subName = activeSubcategories.find(s => sameId(s.id, activeSubcategoryId))?.name;
        return (
            <div>
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-3">
                    <button
                        onClick={() => onSelectSubcategory(null)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                        <ChevronLeft size={14} />
                        {activeCategory?.name}
                    </button>
                    <span className="text-gray-300">/</span>
                    <span className="text-xs font-black text-gray-600">{subName}</span>
                </div>

                {/* Produse */}
                <ProductGrid
                    products={browseProducts}
                    onSelect={onSelectProduct}
                    emptyMsg="Nu există produse în această subcategorie."
                    emptyDescription="Verifică dacă produsele sunt încadrate pe subcategoria corectă în Catalog Produse."
                    showCatalogButton={isAdminOrManager}
                />
            </div>
        );
    }

    // ── View: subcategorii + produse din categoria principală ──
    if (activeCategoryId) {
        return (
            <div>
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-3">
                    <button
                        onClick={() => onSelectCategory(null)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                        <ChevronLeft size={14} />
                        Categorii
                    </button>
                    <span className="text-gray-300">/</span>
                    <span className="text-xs font-black text-gray-600">{activeCategory?.name}</span>
                </div>

                {/* Subcategorii (dacă există) */}
                {activeSubcategories.length > 0 && (
                    <div
                        className="grid grid-cols-3 gap-2 mb-4"
                        data-testid="pos-subcategory-grid"
                    >
                        {activeSubcategories.map(sub => (
                            <button
                                key={sub.id}
                                data-testid={`pos-subcategory-card-${sub.id}`}
                                onClick={() => onSelectSubcategory(sub.id)}
                                className="flex flex-col items-center gap-1.5 p-3 bg-purple-50 hover:bg-purple-100 border-2 border-purple-100 hover:border-purple-300 rounded-xl text-center transition-all active:scale-95 group"
                            >
                                <Tag size={18} className="text-purple-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-black text-purple-700 leading-tight line-clamp-2">{sub.name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Produse din categoria principală */}
                <ProductGrid
                    products={browseProducts}
                    onSelect={onSelectProduct}
                    emptyMsg={`Niciun produs direct în „${activeCategory?.name}"`}
                    emptyDescription="Verifică dacă produsele sunt încadrate pe categoria corectă în Catalog Produse."
                    showCatalogButton={isAdminOrManager}
                />
            </div>
        );
    }

    // ── View: grilă categorii principale ──
    return (
        <div
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-4"
            data-testid="pos-category-grid"
        >
            {categoriesTree.map(cat => (
                <button
                    key={cat.id}
                    data-testid={`pos-category-card-${cat.id}`}
                    onClick={() => onSelectCategory(cat.id)}
                    className="relative flex flex-col items-start gap-2 p-4 bg-white hover:bg-indigo-50 border-2 border-gray-100 hover:border-indigo-200 rounded-2xl text-left transition-all active:scale-95 group shadow-sm hover:shadow-md"
                >
                    <div className="p-2 bg-indigo-100 group-hover:bg-indigo-200 rounded-xl transition-colors">
                        <FolderOpen size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <div className="font-black text-sm text-gray-800 leading-tight">{cat.name}</div>
                        {cat.subcategories.length > 0 && (
                            <div className="text-[10px] text-gray-400 mt-0.5 font-semibold">
                                {cat.subcategories.length} subcategor{cat.subcategories.length === 1 ? 'ie' : 'ii'}
                            </div>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
};

// ─── ProductGrid sub-component ──────────────────────────────────────────
interface ProductGridProps {
    products: PosProduct[];
    onSelect: (p: PosProduct) => void;
    emptyMsg?: string;
    emptyDescription?: string;
    showCatalogButton?: boolean;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onSelect, emptyMsg, emptyDescription, showCatalogButton }) => {
    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center gap-3">
                <div className="p-3 bg-gray-100 text-gray-400 rounded-2xl">
                    <Package size={36} className="opacity-40" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-gray-800">{emptyMsg ?? 'Niciun produs'}</h4>
                    {emptyDescription && (
                        <p className="text-xs text-gray-400 font-medium mt-1.5 max-w-sm mx-auto">{emptyDescription}</p>
                    )}
                </div>
                {showCatalogButton && (
                    <Link
                        to="/produse"
                        className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                        Mergi la Catalog Produse
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-4"
            data-testid="pos-product-grid"
        >
            {products.map(p => (
                <button
                    key={p.id}
                    data-testid={`pos-product-card-${p.id}`}
                    onClick={() => onSelect(p)}
                    disabled={p.stockMagazin <= 0}
                    className={`relative p-4 rounded-2xl shadow-sm border text-left flex flex-col justify-between h-32 transition-all active:scale-95 group ${
                        p.stockMagazin <= 0
                            ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                            : 'bg-white border-white hover:border-indigo-300 hover:shadow-md'
                    }`}
                >
                    <div>
                        <div className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight">{p.name}</div>
                        <div className={`text-xs font-bold mt-1.5 px-2 py-0.5 rounded w-fit ${
                            p.stockMagazin < 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                            Stoc: {p.stockMagazin} {p.unit}
                        </div>
                    </div>
                    <div className="font-black text-lg text-indigo-600 self-end">
                        {p.priceSale.toFixed(2)} <span className="text-xs font-medium text-gray-400">LEI</span>
                    </div>
                    <div className="absolute bottom-1.5 left-3 text-[9px] text-gray-300 font-mono truncate max-w-[80%]">{p.barcode}</div>
                </button>
            ))}
        </div>
    );
};
