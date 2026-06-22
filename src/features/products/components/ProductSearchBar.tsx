import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { CategoryWithSubs } from '../../catalog/types';

interface ProductSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    categories?: CategoryWithSubs[];
    selectedCategoryId?: string;
    onCategoryChange?: (categoryId: string) => void;
    selectedSubcategoryId?: string;
    onSubcategoryChange?: (subcategoryId: string) => void;
}

const FILTER_ALL = '';
const FILTER_UNCATEGORIZED = '__uncategorized__';
const FILTER_NO_SUBCATEGORY = '__no_subcategory__';

const ProductSearchBar = ({
    value,
    onChange,
    categories = [],
    selectedCategoryId = '',
    onCategoryChange,
    selectedSubcategoryId = '',
    onSubcategoryChange
}: ProductSearchBarProps) => {
    const hasFilters = !!selectedCategoryId || !!selectedSubcategoryId;

    // Get subcategories for the selected main category
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const subcategories = selectedCategory?.subcategories ?? [];

    const handleCategoryChange = (catId: string) => {
        onCategoryChange?.(catId);
        // Reset subcategory when category changes
        onSubcategoryChange?.('');
    };

    const handleClearFilters = () => {
        onCategoryChange?.('');
        onSubcategoryChange?.('');
    };

    return (
        <div className="mb-6 space-y-3">
            {/* Search Input */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-300 flex items-center gap-3 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <Search className="text-slate-500" size={20} />
                <input
                    data-testid="products-search-input"
                    type="text"
                    placeholder="Căutare rapidă după denumire produs sau cod de bare..."
                    className="w-full outline-none text-slate-800 placeholder-slate-400 font-semibold bg-transparent"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoFocus
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-650 transition-colors"
                        aria-label="Șterge căutarea"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Category Filters */}
            {categories.length > 0 && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-300 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Filter size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtre</span>
                    </div>

                    {/* Category Dropdown */}
                    <select
                        data-testid="product-filter-category"
                        value={selectedCategoryId}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer min-w-[180px]"
                    >
                        <option value={FILTER_ALL}>Toate categoriile</option>
                        <option data-testid="product-filter-uncategorized" value={FILTER_UNCATEGORIZED}>
                            🏷️ Fără categorie
                        </option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                📁 {cat.name}
                            </option>
                        ))}
                    </select>

                    {/* Subcategory Dropdown (only when a real category is selected) */}
                    {selectedCategoryId && selectedCategoryId !== FILTER_UNCATEGORIZED && (
                        <select
                            data-testid="product-filter-subcategory"
                            value={selectedSubcategoryId}
                            onChange={(e) => onSubcategoryChange?.(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer min-w-[180px]"
                        >
                            <option value={FILTER_ALL}>Toate subcategoriile</option>
                            <option value={FILTER_NO_SUBCATEGORY}>
                                🔖 Fără subcategorie
                            </option>
                            {subcategories.map(sub => (
                                <option key={sub.id} value={sub.id}>
                                    🔖 {sub.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Clear Filters */}
                    {hasFilters && (
                        <button
                            data-testid="product-filter-clear-category"
                            onClick={handleClearFilters}
                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold border border-red-200 transition-all flex items-center gap-1.5"
                        >
                            <X size={14} />
                            Șterge filtrele
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductSearchBar;
export { FILTER_ALL, FILTER_UNCATEGORIZED, FILTER_NO_SUBCATEGORY };
