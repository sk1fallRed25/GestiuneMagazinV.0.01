import React from 'react';
import { Edit3, Trash2, Package } from 'lucide-react';
import { Product, ProductVatConfig } from '../types';
import { normalizeVatGroupForStore, getStandardVatRate } from '../services/productService';
import { Tooltip } from '../../../shared/components/ui';

interface ProductTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
    userRole?: string;
    vatConfig?: ProductVatConfig | null;
    emptyStateDescription?: string;
}

const ProductTable = ({ products, onEdit, onDelete, userRole, vatConfig, emptyStateDescription }: ProductTableProps) => {
    // Definire roluri cu permisiuni de ștergere (v2)
    // În v2, 'admin' și 'platform_owner' au permisiuni de administrare.
    const canDelete = ['admin', 'platform_owner'].includes(userRole || '');

    return (
        <div className="bg-white rounded-3xl shadow-md border border-slate-300 overflow-hidden">
            <table data-testid="products-table" className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest border-b border-slate-300">
                    <tr>
                        <th className="px-6 py-5">Denumire Produs</th>
                        <th className="px-6 py-5">Preț Vânzare</th>
                        <th className="px-6 py-5">TVA</th>
                        <th className="px-6 py-5 text-center">Stoc Depozit</th>
                        <th className="px-6 py-5 text-center">Stoc Magazin</th>
                        <th className="px-6 py-5">U.M.</th>
                        <th className="px-6 py-5 text-center">Acțiuni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {products.map((produs) => (
                        <tr key={produs.id} data-testid="products-table-row" className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-500 group-hover:text-indigo-600 transition-colors">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                         <p className="font-bold text-slate-900 leading-tight">{produs.nume}</p>
                                         <div className="flex flex-wrap items-center gap-2 mt-1">
                                             <span className="text-[10px] font-mono text-slate-500">{produs.cod_bare}</span>
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
                            <td className="px-6 py-4 font-bold text-slate-800">
                                {produs.pret_vanzare.toFixed(2)} <span className="text-[10px] text-slate-500 font-bold">LEI</span>
                            </td>
                            <td className="px-6 py-4">
                                {(() => {
                                    const finalVatGroup = normalizeVatGroupForStore(produs.vatGroup, vatConfig ?? null);
                                    const finalVatPercent = getStandardVatRate(finalVatGroup);
                                    return (
                                        <span 
                                            data-testid="product-vat-badge"
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold leading-none font-mono ${
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
                    ))}
                </tbody>
            </table>
            {products.length === 0 && (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 mb-3 border border-slate-200">
                        <Package size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1">Nu există înregistrări disponibile</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                        {emptyStateDescription || "Nu au fost găsite produse care să corespundă criteriilor de căutare în acest magazin."}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProductTable;
