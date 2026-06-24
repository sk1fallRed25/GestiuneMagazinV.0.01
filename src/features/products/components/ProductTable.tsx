import React from 'react';
import { Edit3, Trash2, Package, FolderOpen, Tag } from 'lucide-react';
import { Product, ProductVatConfig } from '../types';
import { normalizeVatGroupForStore, getStandardVatRate } from '../services/productService';
import { Tooltip, EmptyState, Button, HighlightText } from '../../../shared/components/ui';
import { CategoryWithSubs } from '../../catalog/types';
import { Link } from 'react-router-dom';

interface ProductTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
    userRole?: string;
    vatConfig?: ProductVatConfig | null;
    emptyStateDescription?: string;
    categoriesTree?: CategoryWithSubs[];
    /** Bulk selection */
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
    onToggleSelectAll?: () => void;
    searchTerm?: string;
}

/**
 * Rezolvă categoria/subcategoria unui produs pe baza category_id și arborelui de categorii.
 */
const resolveCategoryPath = (categoryId: string | null | undefined, tree: CategoryWithSubs[]) => {
    if (!categoryId || tree.length === 0) {
        return { mainCategory: null, subcategory: null };
    }

    // Check if category_id is a root category
    const asRoot = tree.find(c => c.id === categoryId);
    if (asRoot) {
        return { mainCategory: asRoot.name, subcategory: null };
    }

    // Check if category_id is a subcategory
    for (const root of tree) {
        const asSub = root.subcategories.find(s => s.id === categoryId);
        if (asSub) {
            return { mainCategory: root.name, subcategory: asSub.name };
        }
    }

    return { mainCategory: null, subcategory: null };
};

const ProductTable = ({
    products,
    onEdit,
    onDelete,
    userRole,
    vatConfig,
    emptyStateDescription,
    categoriesTree = [],
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    searchTerm = ''
}: ProductTableProps) => {
    const canDelete = ['admin', 'platform_owner'].includes(userRole || '');
    const hasBulkSelect = !!onToggleSelect && !!selectedIds;
    const allSelected = hasBulkSelect && products.length > 0 && products.every(p => selectedIds!.has(p.id));

    return (
        <div className="bg-white rounded-3xl shadow-md border border-slate-300 overflow-hidden">
            {products.length === 0 ? (
                <div data-testid="products-table" className="p-12">
                    <EmptyState
                        title={searchTerm ? "Niciun rezultat găsit" : "Nu există produse"}
                        description={
                            searchTerm 
                                ? `Nu am găsit niciun produs care să conțină "${searchTerm}".`
                                : emptyStateDescription || "Începe prin a adăuga produse în catalogul magazinului tău."
                        }
                        icon={<Package size={40} className="text-slate-400" />}
                        action={
                            searchTerm ? (
                                <Link to="/produse">
                                    <Button size="sm" variant="secondary">
                                        Curăță căutarea și filtrele
                                    </Button>
                                </Link>
                            ) : (
                                <Link to="/fast-add">
                                    <Button size="sm" variant="primary">
                                        Adaugă primul produs
                                    </Button>
                                </Link>
                            )
                        }
                    />
                </div>
            ) : (
                <table data-testid="products-table" className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest border-b border-slate-300">
                        <tr>
                            {hasBulkSelect && (
                                <th className="px-4 py-5 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={() => onToggleSelectAll?.()}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </th>
                            )}
                            <th className="px-6 py-5">Denumire Produs</th>
                            <th className="px-5 py-5">Categorie / Subcategorie</th>
                            <th className="px-6 py-5">Preț Vânzare</th>
                            <th className="px-6 py-5">TVA</th>
                            <th className="px-6 py-5 text-center">Stoc Depozit</th>
                            <th className="px-6 py-5 text-center">Stoc Magazin</th>
                            <th className="px-6 py-5">U.M.</th>
                            <th className="px-6 py-5 text-center">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {products.map((produs) => {
                            const { mainCategory, subcategory } = resolveCategoryPath(produs.category_id, categoriesTree);
                            const isSelected = hasBulkSelect && selectedIds!.has(produs.id);

                            return (
                                <tr
                                    key={produs.id}
                                    data-testid="products-table-row"
                                    className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-indigo-50/40' : ''}`}
                                >
                                    {hasBulkSelect && (
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onToggleSelect?.(produs.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-500 group-hover:text-indigo-600 transition-colors">
                                                <Package size={20} />
                                            </div>
                                             <div>
                                                  <p className="font-bold text-slate-900 leading-tight">
                                                      <HighlightText text={produs.nume} search={searchTerm} />
                                                  </p>
                                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                                      <span className="text-[10px] font-mono text-slate-500">
                                                          <HighlightText text={produs.cod_bare} search={searchTerm} />
                                                      </span>
                                                     {produs.sgrEnabled && produs.sgrType && (
                                                         <span
                                                             data-testid="product-sgr-badge"
                                                             className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200/50 cursor-help"
                                                             title="Garanție 0.50 lei, TVA D — 0%"
                                                         >
                                                             SGR - {produs.sgrType.toUpperCase()}
                                                         </span>
                                                     )}
                                                 </div>
                                             </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4" data-testid="product-row-category-path">
                                        <div className="flex flex-col gap-1">
                                            {mainCategory ? (
                                                <>
                                                    <span
                                                        data-testid="product-row-category"
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight bg-indigo-50 text-indigo-700 border border-indigo-100 w-fit"
                                                    >
                                                        <FolderOpen size={10} />
                                                        {mainCategory}
                                                    </span>
                                                    <span
                                                        data-testid="product-row-subcategory"
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold w-fit ${
                                                            subcategory
                                                                ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                                                : 'text-slate-400 italic'
                                                        }`}
                                                    >
                                                        <Tag size={10} />
                                                        {subcategory || 'Fără subcategorie'}
                                                    </span>
                                                </>
                                            ) : (
                                                <span
                                                    data-testid="product-row-category"
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 w-fit"
                                                >
                                                    <FolderOpen size={10} />
                                                    Necategorizat
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-black font-mono text-slate-800">
                                        {produs.pret_vanzare.toFixed(2)} LEI
                                    </td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const finalVatGroup = normalizeVatGroupForStore(produs.vatGroup, vatConfig ?? null);
                                            const finalVatPercent = getStandardVatRate(finalVatGroup);
                                            return (
                                                <span
                                                    data-testid="product-vat-badge"
                                                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                        finalVatGroup === 'E'
                                                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                                    }`}
                                                >
                                                    {finalVatGroup} ({finalVatPercent}%)
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-indigo-600 bg-indigo-50/30">
                                        {produs.stoc_depozit}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-purple-600">
                                        {produs.stoc_magazin}
                                    </td>
                                    <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                        {produs.um}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <Tooltip content="Editează produs">
                                                <button
                                                    data-testid="product-edit-button"
                                                    onClick={() => onEdit(produs)}
                                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            </Tooltip>

                                            {canDelete && (
                                                <Tooltip content="Arhivează produs (ADMIN)">
                                                    <button
                                                        data-testid="product-archive-button"
                                                        onClick={() => onDelete(produs.id)}
                                                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ProductTable;
