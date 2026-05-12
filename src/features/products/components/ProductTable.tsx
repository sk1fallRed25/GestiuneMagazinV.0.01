import React from 'react';
import { Edit3, Trash2, Package } from 'lucide-react';
import { Product } from '../types';

interface ProductTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: number) => void;
    userRole?: string;
}

const ProductTable = ({ products, onEdit, onDelete, userRole }: ProductTableProps) => {
    // Definire roluri cu permisiuni de ștergere (unsafe)
    const canDelete = ['admin', 'platform_owner', 'tenant_admin'].includes(userRole || '');

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-5">Denumire Produs</th>
                        <th className="px-6 py-5">Preț Vânzare</th>
                        <th className="px-6 py-5 text-center">Stoc Depozit</th>
                        <th className="px-6 py-5 text-center">Stoc Magazin</th>
                        <th className="px-6 py-5">U.M.</th>
                        <th className="px-6 py-5 text-center">Acțiuni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {products.map((produs) => (
                        <tr key={produs.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-400 group-hover:text-indigo-600 transition-colors">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 leading-tight">{produs.nume}</p>
                                        <p className="text-[10px] font-mono text-gray-400 mt-1">{produs.cod_bare}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-700">
                                {produs.pret_vanzare.toFixed(2)} <span className="text-[10px] text-gray-400">LEI</span>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-indigo-600 bg-indigo-50/30">
                                {produs.stoc_depozit}
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-purple-600">
                                {produs.stoc_magazin}
                            </td>
                            <td className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                {produs.um}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex justify-center gap-2">
                                    {/* Butonul Edit este vizibil pentru toți cei care pot accesa pagina */}
                                    <button
                                        onClick={() => onEdit(produs)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        title="Editează produs"
                                    >
                                        <Edit3 size={18} />
                                    </button>

                                    {/* Butonul Delete este vizibil DOAR pentru Admin / Owner */}
                                    {canDelete && (
                                        <button
                                            onClick={() => onDelete(produs.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Ștergere definitivă (ADMIN)"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {products.length === 0 && (
                <div className="p-12 text-center text-gray-400 italic">
                    Nu au fost găsite produse care să corespundă căutării.
                </div>
            )}
        </div>
    );
};

export default ProductTable;
